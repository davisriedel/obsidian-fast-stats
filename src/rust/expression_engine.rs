use crate::{custom_functions::register_custom_functions, parser::ParserOptions};
use evalexpr::{ContextWithMutableVariables, HashMapContext, Value as EvalValue};
use minijinja::Environment;
use wasm_bindgen::prelude::*;

/// A custom stat definition with an ID and expression
#[derive(Clone, serde::Deserialize, serde::Serialize, tsify::Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CustomStat {
  pub id: String,
  pub expr: String,
}

/// The main expression engine that combines stat counting, expression evaluation, and template rendering
#[wasm_bindgen]
pub struct ExpressionEngine {
  options: ParserOptions,
}

#[wasm_bindgen]
impl ExpressionEngine {
  /// Create a new ExpressionEngine with the given options
  /// Accepts a plain JavaScript object: { strip_comments: boolean, strip_code_blocks: boolean, strip_metadata_blocks: boolean }
  #[wasm_bindgen(constructor)]
  pub fn new(options: ParserOptions) -> Result<ExpressionEngine, JsValue> {
    Ok(ExpressionEngine { options })
  }

  /// Create a fresh evaluation context with custom functions registered
  fn create_eval_context() -> Result<HashMapContext, JsValue> {
    let mut eval_context = HashMapContext::new();
    register_custom_functions(&mut eval_context)
      .map_err(|e| JsValue::from_str(&format!("Failed to register custom functions: {}", e)))?;
    Ok(eval_context)
  }

  /// Evaluate all custom stat expressions and render the status bar template
  ///
  /// This is the main API that:
  /// 1. Gets raw stats (chars, words, etc.)
  /// 2. Evaluates all custom stat expressions
  /// 3. Builds a context with all stat values
  /// 4. Renders the template with the context
  pub fn render_status_bar(
    &self,
    text: &str,
    custom_stats: Vec<CustomStat>,
    template: &str,
  ) -> Result<String, JsValue> {
    let mut stats_map = StatsMap::new();

    // Create eval context for expression evaluation
    let mut eval_ctx = Self::create_eval_context()?;

    // Compute all stats once
    let counts = crate::parser::count(text, &self.options);

    // Add raw stats to both the template context and eval context
    let stats = [
      ("chars", counts.chars),
      ("charsWithoutWhitespace", counts.chars_no_whitespace),
      ("words", counts.words),
      ("sentences", counts.sentences),
      ("paragraphs", counts.paragraphs),
    ];

    for (stat_name, value) in stats {
      stats_map.insert(stat_name.to_string(), value as f64);

      // Update eval context with this variable (use Float to enable float division)
      eval_ctx
        .set_value(stat_name.to_string(), EvalValue::Float(value as f64))
        .map_err(|e| {
          JsValue::from_str(&format!("Failed to set variable '{}': {}", stat_name, e))
        })?;
    }

    // Evaluate custom stats and add to context
    for custom_stat in custom_stats {
      let value = Self::evaluate_expression_with_context(&custom_stat.expr, &eval_ctx)?;
      stats_map.insert_eval_value(custom_stat.id.clone(), value.clone());

      // Also make this available for subsequent expressions
      eval_ctx
        .set_value(custom_stat.id.clone(), value)
        .map_err(|e| {
          JsValue::from_str(&format!(
            "Failed to set custom stat '{}': {}",
            custom_stat.id, e
          ))
        })?;
    }

    // Render template with minijinja
    let rendered = self.render_template(template, &stats_map)?;

    Ok(rendered)
  }

  /// Evaluate a single expression and return the result
  ///
  /// This is used for API compatibility where you just want to evaluate
  /// one expression without rendering a template
  pub fn evaluate_expression(&self, text: &str, expr: &str) -> Result<f64, JsValue> {
    // Build a fresh context with current stat values
    let mut eval_ctx = Self::create_eval_context()?;

    // Compute all stats once
    let counts = crate::parser::count(text, &self.options);

    let stats = [
      ("chars", counts.chars),
      ("charsWithoutWhitespace", counts.chars_no_whitespace),
      ("words", counts.words),
      ("sentences", counts.sentences),
      ("paragraphs", counts.paragraphs),
    ];

    for (stat_name, value) in stats {
      // Use Float to enable float division in expressions
      eval_ctx
        .set_value(stat_name.to_string(), EvalValue::Float(value as f64))
        .map_err(|e| {
          JsValue::from_str(&format!("Failed to set variable '{}': {}", stat_name, e))
        })?;
    }

    let result = Self::evaluate_expression_with_context(expr, &eval_ctx)?;

    // Convert result to f64 (this API specifically requires numeric results)
    match result {
      EvalValue::Float(f) => Ok(f),
      EvalValue::Int(i) => Ok(i as f64),
      _ => Err(JsValue::from_str(&format!(
        "Expression '{}' must evaluate to a number for this API, got: {:?}",
        expr, result
      ))),
    }
  }

  /// Internal expression evaluation with a given context
  /// Returns the raw EvalValue to support both numeric and string results
  fn evaluate_expression_with_context(
    expr: &str,
    eval_ctx: &HashMapContext,
  ) -> Result<EvalValue, JsValue> {
    evalexpr::eval_with_context(expr, eval_ctx)
      .map_err(|e| JsValue::from_str(&format!("Failed to evaluate expression '{}': {}", expr, e)))
  }

  /// Render a template using minijinja
  fn render_template(&self, template: &str, stats: &StatsMap) -> Result<String, JsValue> {
    let env = Environment::new();
    let tmpl = env
      .template_from_str(template)
      .map_err(|e| JsValue::from_str(&format!("Failed to compile template: {}", e)))?;

    // Convert HashMap to minijinja context
    let rendered = tmpl
      .render(&stats.0)
      .map_err(|e| JsValue::from_str(&format!("Failed to render template: {}", e)))?;

    Ok(rendered)
  }
}

/// Helper struct to build the stats context for minijinja
/// Uses minijinja::Value to represent numbers intelligently (int vs float)
struct StatsMap(std::collections::HashMap<String, minijinja::Value>);

impl StatsMap {
  fn new() -> Self {
    Self(std::collections::HashMap::new())
  }

  fn insert(&mut self, key: String, value: f64) {
    // If the value is a whole number, store as int for cleaner display
    if value.fract() == 0.0 && value.is_finite() {
      self.0.insert(key, minijinja::Value::from(value as i64));
    } else {
      self.0.insert(key, minijinja::Value::from(value));
    }
  }

  fn insert_eval_value(&mut self, key: String, value: EvalValue) {
    match value {
      EvalValue::String(s) => {
        self.0.insert(key, minijinja::Value::from(s));
      }
      EvalValue::Float(f) => {
        // If the value is a whole number, store as int for cleaner display
        if f.fract() == 0.0 && f.is_finite() {
          self.0.insert(key, minijinja::Value::from(f as i64));
        } else {
          self.0.insert(key, minijinja::Value::from(f));
        }
      }
      EvalValue::Int(i) => {
        self.0.insert(key, minijinja::Value::from(i));
      }
      EvalValue::Boolean(b) => {
        self.0.insert(key, minijinja::Value::from(b));
      }
      EvalValue::Tuple(_) | EvalValue::Empty => {
        // These types aren't directly supported in templates
        // Convert to string representation
        self
          .0
          .insert(key, minijinja::Value::from(format!("{:?}", value)));
      }
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_expression_engine_basic() {
    let options = ParserOptions {
      strip_comments: false,
      strip_code_blocks: false,
      strip_metadata_blocks: false,
    };
    let engine = ExpressionEngine { options };

    let text = "Hello world! This is a test.";

    // Test basic stat retrieval via expression
    let result = engine.evaluate_expression(text, "words").unwrap();
    assert_eq!(result, 6.0);

    let result = engine.evaluate_expression(text, "chars").unwrap();
    assert_eq!(result, 28.0);
  }

  #[test]
  fn test_expression_engine_custom_functions() {
    let options = ParserOptions {
      strip_comments: false,
      strip_code_blocks: false,
      strip_metadata_blocks: false,
    };
    let engine = ExpressionEngine { options };

    let text = "Hello world!";

    // Test roundTo function
    let result = engine
      .evaluate_expression(text, "roundTo(chars / 1800, 2)")
      .unwrap();
    // 12 / 1800 = 0.006666... -> rounds to 0.01
    assert_eq!(result, 0.01);

    // Test minsToTime function
    let eval_ctx = ExpressionEngine::create_eval_context().unwrap();
    let result_val = evalexpr::eval_with_context("minsToTime(5.5, \"%M:%S\")", &eval_ctx).unwrap();
    assert_eq!(result_val, EvalValue::String("05:30".to_string()));
  }

  #[test]
  fn test_render_status_bar() {
    let options = ParserOptions {
      strip_comments: false,
      strip_code_blocks: false,
      strip_metadata_blocks: false,
    };
    let engine = ExpressionEngine { options };

    let text = "Hello world! This is a test.";

    let custom_stats = vec![CustomStat {
      id: "pages".to_string(),
      expr: "roundTo(chars / 1800, 2)".to_string(),
    }];

    let result = engine
      .render_status_bar(text, custom_stats, "{{chars}}c {{words}}w {{pages}}p")
      .unwrap();

    // 28 chars, 6 words, 28/1800 = 0.016 -> rounds to 0.02
    assert_eq!(result, "28c 6w 0.02p");
  }

  #[test]
  fn test_render_status_bar_with_dependent_stats() {
    let options = ParserOptions {
      strip_comments: false,
      strip_code_blocks: false,
      strip_metadata_blocks: false,
    };
    let engine = ExpressionEngine { options };

    let text = "Hello world!";

    // Create custom stats where one depends on another
    let custom_stats = vec![
      CustomStat {
        id: "pages".to_string(),
        expr: "roundTo(chars / 1800, 2)".to_string(),
      },
      CustomStat {
        id: "pagesDoubled".to_string(),
        expr: "pages * 2".to_string(),
      },
    ];

    let result = engine
      .render_status_bar(text, custom_stats, "{{pages}}p {{pagesDoubled}}pd")
      .unwrap();

    // 12 chars / 1800 = 0.006666... -> rounds to 0.01
    // 0.01 * 2 = 0.02
    assert_eq!(result, "0.01p 0.02pd");
  }

  #[test]
  fn test_render_status_bar_with_string_stat() {
    let options = ParserOptions {
      strip_comments: false,
      strip_code_blocks: false,
      strip_metadata_blocks: false,
    };
    let engine = ExpressionEngine { options };

    let text = "word ".repeat(50); // 50 words

    // Create custom stats with both numeric and string values
    let custom_stats = vec![
      CustomStat {
        id: "readingMins".to_string(),
        expr: "words / 250".to_string(), // 50 / 250 = 0.2 minutes
      },
      CustomStat {
        id: "readingTime".to_string(),
        expr: "minsToTime(readingMins, \"%M:%S\")".to_string(),
      },
    ];

    let result = engine
      .render_status_bar(&text, custom_stats, "{{words}} words, {{readingTime}}")
      .unwrap();

    // 50 words, 0.2 minutes = 12 seconds -> "00:12"
    assert_eq!(result, "50 words, 00:12");
  }
}
