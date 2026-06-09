extern crate console_error_panic_hook;
use std::panic;

mod console_log;
mod custom_functions;
mod expression_engine;
mod parser;

use wasm_bindgen::prelude::*;

pub use expression_engine::{CustomStat, ExpressionEngine};

#[wasm_bindgen]
pub fn init() {
  panic::set_hook(Box::new(console_error_panic_hook::hook))
}
