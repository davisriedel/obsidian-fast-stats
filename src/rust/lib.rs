extern crate console_error_panic_hook;
use std::panic;

mod console_log;
mod parser;

use wasm_bindgen::prelude::*;

use parser::{count, Counts, ParserOptions};
use std::convert::Into;
use std::str::FromStr;
use strum::EnumString;

#[wasm_bindgen]
pub fn init() {
  panic::set_hook(Box::new(console_error_panic_hook::hook))
}

#[derive(EnumString)]
pub enum StatType {
  Chars,
  CharsWithoutWhitespace,
  Words,
  Sentences,
  Paragraphs,
}

#[wasm_bindgen]
pub struct StatCounter {
  pub options: StatCounterOptions,
  counts: Counts,
}

#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct StatCounterOptions {
  pub strip_comments: bool,
  pub strip_code_blocks: bool,
  pub strip_metadata_blocks: bool,
}

#[wasm_bindgen]
impl StatCounterOptions {
  #[wasm_bindgen(constructor)]
  pub fn new(strip_comments: bool, strip_code_blocks: bool, strip_metadata_blocks: bool) -> Self {
    Self {
      strip_comments,
      strip_code_blocks,
      strip_metadata_blocks,
    }
  }
}

impl Into<ParserOptions> for StatCounterOptions {
  fn into(self) -> ParserOptions {
    ParserOptions {
      strip_comments: self.strip_comments,
      strip_code_blocks: self.strip_code_blocks,
      strip_metadata_blocks: self.strip_metadata_blocks,
    }
  }
}

#[wasm_bindgen]
impl StatCounter {
  #[wasm_bindgen(constructor)]
  pub fn new(options: StatCounterOptions) -> Self {
    Self {
      options,
      counts: Counts::default(),
    }
  }

  pub fn doc_changed(&mut self, text: &str) {
    self.counts = count(text, &self.options.into());
  }

  pub fn get_stat(&mut self, stat_str: &str) -> usize {
    let stat = StatType::from_str(stat_str).expect("Unknown stat type specified");
    match stat {
      StatType::Chars => self.counts.chars,
      StatType::CharsWithoutWhitespace => self.counts.chars_no_whitespace,
      StatType::Words => self.counts.words,
      StatType::Sentences => self.counts.sentences,
      StatType::Paragraphs => self.counts.paragraphs,
    }
  }
}
