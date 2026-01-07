use chrono::NaiveTime;
use evalexpr::{ContextWithMutableFunctions, EvalexprError, HashMapContext, Value};
use std::time::Duration;

/// Helper function to extract a numeric value from an evalexpr Value
fn extract_number(value: &Value) -> Result<f64, EvalexprError> {
  match value {
    Value::Float(f) => Ok(*f),
    Value::Int(i) => Ok(*i as f64),
    _ => Err(EvalexprError::TypeError {
      expected: vec![evalexpr::ValueType::Float, evalexpr::ValueType::Int],
      actual: value.clone(),
    }),
  }
}

/// Registers all custom functions with the evalexpr context
pub fn register_custom_functions(context: &mut HashMapContext) -> Result<(), EvalexprError> {
  context.set_function(
    "roundTo".to_string(),
    evalexpr::Function::new(round_to_function),
  )?;
  context.set_function(
    "minsToTime".to_string(),
    evalexpr::Function::new(mins_to_time_function),
  )?;
  context.set_function(
    "hoursToTime".to_string(),
    evalexpr::Function::new(hours_to_time_function),
  )?;
  context.set_function(
    "secondsToTime".to_string(),
    evalexpr::Function::new(seconds_to_time_function),
  )?;
  context.set_function(
    "formatPercent".to_string(),
    evalexpr::Function::new(format_percent_function),
  )?;
  context.set_function(
    "pluralize".to_string(),
    evalexpr::Function::new(pluralize_function),
  )?;
  context.set_function(
    "clamp".to_string(),
    evalexpr::Function::new(clamp_function),
  )?;
  context.set_function(
    "abbreviateNum".to_string(),
    evalexpr::Function::new(abbreviate_num_function),
  )?;
  context.set_function(
    "formatDuration".to_string(),
    evalexpr::Function::new(format_duration_function),
  )?;
  Ok(())
}

/// roundTo(value, decimals) - Round a number to the specified number of decimal places
///
/// Examples:
/// - roundTo(3.14159, 2) -> 3.14
/// - roundTo(100.5, 0) -> 101
fn round_to_function(args: &Value) -> Result<Value, EvalexprError> {
  let args_tuple = args.as_tuple()?;

  if args_tuple.len() != 2 {
    return Err(EvalexprError::WrongFunctionArgumentAmount {
      expected: 2..=2,
      actual: args_tuple.len(),
    });
  }

  let value = extract_number(&args_tuple[0])?;
  let decimals = args_tuple[1].as_int()?;

  if decimals < 0 {
    return Err(EvalexprError::CustomMessage(
      "decimals parameter must be non-negative".to_string(),
    ));
  }

  let multiplier = 10_f64.powi(decimals as i32);
  let rounded = (value * multiplier).round() / multiplier;

  Ok(Value::Float(rounded))
}

/// minsToTime(minutes, format) - Format minutes as a time string
///
/// Converts a number of minutes into a time string using the specified format.
/// The time is calculated from midnight (00:00:00) + the specified minutes.
///
/// Uses chrono format strings. See: https://docs.rs/chrono/latest/chrono/format/strftime/index.html
fn mins_to_time_function(args: &Value) -> Result<Value, EvalexprError> {
  let args_tuple = args.as_tuple()?;

  if args_tuple.len() != 2 {
    return Err(EvalexprError::WrongFunctionArgumentAmount {
      expected: 2..=2,
      actual: args_tuple.len(),
    });
  }

  let mins = extract_number(&args_tuple[0])?;
  let format_str = args_tuple[1].as_string()?;

  // Convert minutes to total seconds
  let total_seconds = (mins * 60.0).round() as u32;
  let hours = total_seconds / 3600;
  let minutes = (total_seconds % 3600) / 60;
  let seconds = total_seconds % 60;

  // Create a NaiveTime from the calculated hours, minutes, seconds
  let time = NaiveTime::from_hms_opt(hours, minutes, seconds).ok_or_else(|| {
    EvalexprError::CustomMessage(format!(
      "Invalid time: {} minutes results in {}:{}:{} which is out of range",
      mins, hours, minutes, seconds
    ))
  })?;

  // Format the time using the provided format string
  let formatted = format!("{}", time.format(&format_str));

  Ok(Value::String(formatted))
}

/// hoursToTime(hours, format) - Format hours as a time string
///
/// Converts a number of hours into a time string using the specified format.
/// The time is calculated from midnight (00:00:00) + the specified hours.
///
/// Uses chrono format strings. See: https://docs.rs/chrono/latest/chrono/format/strftime/index.html
fn hours_to_time_function(args: &Value) -> Result<Value, EvalexprError> {
  let args_tuple = args.as_tuple()?;

  if args_tuple.len() != 2 {
    return Err(EvalexprError::WrongFunctionArgumentAmount {
      expected: 2..=2,
      actual: args_tuple.len(),
    });
  }

  let hours = extract_number(&args_tuple[0])?;
  let format_str = args_tuple[1].as_string()?;

  // Convert hours to minutes, then use mins_to_time logic
  let mins = hours * 60.0;
  mins_to_time_function(&Value::Tuple(vec![
    Value::Float(mins),
    Value::String(format_str),
  ]))
}

/// secondsToTime(seconds, format) - Format seconds as a time string
///
/// Converts a number of seconds into a time string using the specified format.
/// The time is calculated from midnight (00:00:00) + the specified seconds.
///
/// Uses chrono format strings. See: https://docs.rs/chrono/latest/chrono/format/strftime/index.html
fn seconds_to_time_function(args: &Value) -> Result<Value, EvalexprError> {
  let args_tuple = args.as_tuple()?;

  if args_tuple.len() != 2 {
    return Err(EvalexprError::WrongFunctionArgumentAmount {
      expected: 2..=2,
      actual: args_tuple.len(),
    });
  }

  let seconds = extract_number(&args_tuple[0])?;
  let format_str = args_tuple[1].as_string()?;

  // Convert seconds to total seconds
  let total_seconds = seconds.round() as u32;
  let hours = total_seconds / 3600;
  let minutes = (total_seconds % 3600) / 60;
  let secs = total_seconds % 60;

  // Create a NaiveTime from the calculated hours, minutes, seconds
  let time = NaiveTime::from_hms_opt(hours, minutes, secs).ok_or_else(|| {
    EvalexprError::CustomMessage(format!(
      "Invalid time: {} seconds results in {}:{}:{} which is out of range",
      seconds, hours, minutes, secs
    ))
  })?;

  // Format the time using the provided format string
  let formatted = format!("{}", time.format(&format_str));

  Ok(Value::String(formatted))
}

/// formatPercent(value, total, decimals) - Calculate and format as percentage
///
/// Calculates (value / total * 100) and formats with a % sign.
///
/// Examples:
/// - formatPercent(25, 100, 0) -> "25%"
/// - formatPercent(1337, 5000, 1) -> "26.7%"
/// - formatPercent(42.5, 50, 2) -> "85.00%"
fn format_percent_function(args: &Value) -> Result<Value, EvalexprError> {
  let args_tuple = args.as_tuple()?;

  if args_tuple.len() != 3 {
    return Err(EvalexprError::WrongFunctionArgumentAmount {
      expected: 3..=3,
      actual: args_tuple.len(),
    });
  }

  let value = extract_number(&args_tuple[0])?;
  let total = extract_number(&args_tuple[1])?;
  let decimals = args_tuple[2].as_int()?;

  if decimals < 0 {
    return Err(EvalexprError::CustomMessage(
      "decimals parameter must be non-negative".to_string(),
    ));
  }

  let percent = if total == 0.0 { 0.0 } else { (value / total) * 100.0 };

  let multiplier = 10_f64.powi(decimals as i32);
  let rounded = (percent * multiplier).round() / multiplier;

  let formatted = if decimals == 0 {
    format!("{}%", rounded as i64)
  } else {
    format!("{:.prec$}%", rounded, prec = decimals as usize)
  };

  Ok(Value::String(formatted))
}

/// pluralize(count, singular, plural) - Return singular or plural form based on count
///
/// Returns the singular form if count is 1, otherwise returns the plural form.
///
/// Examples:
/// - pluralize(1, "word", "words") -> "word"
/// - pluralize(5, "word", "words") -> "words"
/// - pluralize(0, "page", "pages") -> "pages"
fn pluralize_function(args: &Value) -> Result<Value, EvalexprError> {
  let args_tuple = args.as_tuple()?;

  if args_tuple.len() != 3 {
    return Err(EvalexprError::WrongFunctionArgumentAmount {
      expected: 3..=3,
      actual: args_tuple.len(),
    });
  }

  let count = extract_number(&args_tuple[0])?;
  let singular = args_tuple[1].as_string()?;
  let plural = args_tuple[2].as_string()?;

  let result = if count == 1.0 { singular } else { plural };

  Ok(Value::String(result))
}

/// clamp(value, min, max) - Constrain a value to be within a range
///
/// Returns min if value < min, max if value > max, otherwise returns value.
///
/// Examples:
/// - clamp(5, 0, 10) -> 5
/// - clamp(-5, 0, 10) -> 0
/// - clamp(15, 0, 10) -> 10
fn clamp_function(args: &Value) -> Result<Value, EvalexprError> {
  let args_tuple = args.as_tuple()?;

  if args_tuple.len() != 3 {
    return Err(EvalexprError::WrongFunctionArgumentAmount {
      expected: 3..=3,
      actual: args_tuple.len(),
    });
  }

  let value = extract_number(&args_tuple[0])?;
  let min = extract_number(&args_tuple[1])?;
  let max = extract_number(&args_tuple[2])?;
  let clamped = value.clamp(min, max);

  Ok(Value::Float(clamped))
}

/// abbreviateNum(value, decimals) - Format large numbers with K, M, B suffixes
///
/// Abbreviates numbers using metric suffixes for readability.
///
/// Examples:
/// - abbreviateNum(1500, 1) -> "1.5K"
/// - abbreviateNum(1000000, 0) -> "1M"
/// - abbreviateNum(2500000, 2) -> "2.50M"
/// - abbreviateNum(999, 0) -> "999"
fn abbreviate_num_function(args: &Value) -> Result<Value, EvalexprError> {
  let args_tuple = args.as_tuple()?;

  if args_tuple.len() != 2 {
    return Err(EvalexprError::WrongFunctionArgumentAmount {
      expected: 2..=2,
      actual: args_tuple.len(),
    });
  }

  let value = extract_number(&args_tuple[0])?;
  let decimals = args_tuple[1].as_int()?;

  if decimals < 0 {
    return Err(EvalexprError::CustomMessage(
      "decimals parameter must be non-negative".to_string(),
    ));
  }

  let abs_value = value.abs();
  let (divisor, suffix) = if abs_value >= 1_000_000_000.0 {
    (1_000_000_000.0, "B")
  } else if abs_value >= 1_000_000.0 {
    (1_000_000.0, "M")
  } else if abs_value >= 1_000.0 {
    (1_000.0, "K")
  } else {
    (1.0, "")
  };

  let abbreviated = value / divisor;
  let multiplier = 10_f64.powi(decimals as i32);
  let rounded = (abbreviated * multiplier).round() / multiplier;

  let formatted = if decimals == 0 {
    format!("{}{}", rounded as i64, suffix)
  } else {
    format!("{:.prec$}{}", rounded, suffix, prec = decimals as usize)
  };

  Ok(Value::String(formatted))
}

/// formatDuration(minutes) - Format minutes as human-readable duration
///
/// Converts minutes into a human-readable format like "2h 5m" or "45m".
///
/// Examples:
/// - formatDuration(5) -> "5m"
/// - formatDuration(65) -> "1h 5m"
/// - formatDuration(125) -> "2h 5m"
/// - formatDuration(120) -> "2h"
fn format_duration_function(args: &Value) -> Result<Value, EvalexprError> {
  // Handle single argument that might not be wrapped in a tuple
  let minutes = extract_number(args)?;
  let total_secs = (minutes * 60.0).round() as u64;
  let duration = Duration::from_secs(total_secs);

  let formatted = humantime::format_duration(duration).to_string();

  Ok(Value::String(formatted))
}

#[cfg(test)]
mod tests {
  use super::*;
  use evalexpr::Value;

  #[test]
  fn test_round_to() {
    let args = Value::Tuple(vec![Value::Float(3.14159), Value::Int(2)]);
    let result = round_to_function(&args).unwrap();
    assert_eq!(result, Value::Float(3.14));

    let args = Value::Tuple(vec![Value::Float(100.5), Value::Int(0)]);
    let result = round_to_function(&args).unwrap();
    assert_eq!(result, Value::Float(101.0));

    let args = Value::Tuple(vec![Value::Int(5), Value::Int(2)]);
    let result = round_to_function(&args).unwrap();
    assert_eq!(result, Value::Float(5.0));
  }

  #[test]
  fn test_mins_to_time() {
    let args = Value::Tuple(vec![Value::Float(5.5), Value::String("%M:%S".to_string())]);
    let result = mins_to_time_function(&args).unwrap();
    assert_eq!(result, Value::String("05:30".to_string()));

    let args = Value::Tuple(vec![
      Value::Float(65.0),
      Value::String("%H:%M:%S".to_string()),
    ]);
    let result = mins_to_time_function(&args).unwrap();
    assert_eq!(result, Value::String("01:05:00".to_string()));
  }

  #[test]
  fn test_round_to_wrong_arg_count() {
    let args = Value::Tuple(vec![Value::Float(3.14)]);
    assert!(round_to_function(&args).is_err());
  }

  #[test]
  fn test_mins_to_time_negative_decimals() {
    let args = Value::Tuple(vec![Value::Float(3.14), Value::Int(-1)]);
    assert!(round_to_function(&args).is_err());
  }

  #[test]
  fn test_hours_to_time() {
    let args = Value::Tuple(vec![Value::Float(1.5), Value::String("%H:%M:%S".to_string())]);
    let result = hours_to_time_function(&args).unwrap();
    assert_eq!(result, Value::String("01:30:00".to_string()));

    let args = Value::Tuple(vec![Value::Int(2), Value::String("%H:%M".to_string())]);
    let result = hours_to_time_function(&args).unwrap();
    assert_eq!(result, Value::String("02:00".to_string()));
  }

  #[test]
  fn test_seconds_to_time() {
    let args = Value::Tuple(vec![Value::Float(90.0), Value::String("%M:%S".to_string())]);
    let result = seconds_to_time_function(&args).unwrap();
    assert_eq!(result, Value::String("01:30".to_string()));

    let args = Value::Tuple(vec![Value::Int(3661), Value::String("%H:%M:%S".to_string())]);
    let result = seconds_to_time_function(&args).unwrap();
    assert_eq!(result, Value::String("01:01:01".to_string()));
  }

  #[test]
  fn test_format_percent() {
    let args = Value::Tuple(vec![Value::Int(25), Value::Int(100), Value::Int(0)]);
    let result = format_percent_function(&args).unwrap();
    assert_eq!(result, Value::String("25%".to_string()));

    let args = Value::Tuple(vec![Value::Int(1337), Value::Int(5000), Value::Int(1)]);
    let result = format_percent_function(&args).unwrap();
    assert_eq!(result, Value::String("26.7%".to_string()));

    let args = Value::Tuple(vec![Value::Float(42.5), Value::Int(50), Value::Int(2)]);
    let result = format_percent_function(&args).unwrap();
    assert_eq!(result, Value::String("85.00%".to_string()));

    let args = Value::Tuple(vec![Value::Int(0), Value::Int(100), Value::Int(2)]);
    let result = format_percent_function(&args).unwrap();
    assert_eq!(result, Value::String("0.00%".to_string()));
  }

  #[test]
  fn test_format_percent_division_by_zero() {
    let args = Value::Tuple(vec![Value::Int(50), Value::Int(0), Value::Int(2)]);
    let result = format_percent_function(&args).unwrap();
    assert_eq!(result, Value::String("0.00%".to_string()));
  }

  #[test]
  fn test_pluralize() {
    let args = Value::Tuple(vec![
      Value::Int(1),
      Value::String("word".to_string()),
      Value::String("words".to_string()),
    ]);
    let result = pluralize_function(&args).unwrap();
    assert_eq!(result, Value::String("word".to_string()));

    let args = Value::Tuple(vec![
      Value::Int(5),
      Value::String("word".to_string()),
      Value::String("words".to_string()),
    ]);
    let result = pluralize_function(&args).unwrap();
    assert_eq!(result, Value::String("words".to_string()));

    let args = Value::Tuple(vec![
      Value::Int(0),
      Value::String("page".to_string()),
      Value::String("pages".to_string()),
    ]);
    let result = pluralize_function(&args).unwrap();
    assert_eq!(result, Value::String("pages".to_string()));
  }

  #[test]
  fn test_clamp() {
    let args = Value::Tuple(vec![Value::Int(5), Value::Int(0), Value::Int(10)]);
    let result = clamp_function(&args).unwrap();
    assert_eq!(result, Value::Float(5.0));

    let args = Value::Tuple(vec![Value::Int(-5), Value::Int(0), Value::Int(10)]);
    let result = clamp_function(&args).unwrap();
    assert_eq!(result, Value::Float(0.0));

    let args = Value::Tuple(vec![Value::Int(15), Value::Int(0), Value::Int(10)]);
    let result = clamp_function(&args).unwrap();
    assert_eq!(result, Value::Float(10.0));
  }

  #[test]
  fn test_abbreviate_num() {
    let args = Value::Tuple(vec![Value::Int(1500), Value::Int(1)]);
    let result = abbreviate_num_function(&args).unwrap();
    assert_eq!(result, Value::String("1.5K".to_string()));

    let args = Value::Tuple(vec![Value::Int(1000000), Value::Int(0)]);
    let result = abbreviate_num_function(&args).unwrap();
    assert_eq!(result, Value::String("1M".to_string()));

    let args = Value::Tuple(vec![Value::Int(999), Value::Int(0)]);
    let result = abbreviate_num_function(&args).unwrap();
    assert_eq!(result, Value::String("999".to_string()));
  }

  #[test]
  fn test_format_duration() {
    let result = format_duration_function(&Value::Int(5)).unwrap();
    assert!(result.as_string().unwrap().contains("5m"));

    let result = format_duration_function(&Value::Int(65)).unwrap();
    let formatted = result.as_string().unwrap();
    assert!(formatted.contains("1h") && formatted.contains("5m"));
  }
}
