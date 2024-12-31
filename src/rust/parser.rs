use pulldown_cmark::{CowStr, Event, Options, Parser, Tag, TagEnd, TextMergeStream};

// use crate::console_log;
// use crate::console_log::log;

#[derive(Debug, Default)]
pub struct Counts {
  pub chars: usize,
  pub chars_no_whitespace: usize,
  pub words: usize,
  pub sentences: usize,
  pub paragraphs: usize,
}

#[derive(Debug)]
struct ParserState {
  counts: Counts,
  is_metadata_block: bool,
  is_comment: bool,
}

impl ParserState {
  fn new() -> Self {
    Self {
      counts: Counts::default(),
      is_metadata_block: false,
      is_comment: false,
    }
  }
}

#[derive(Debug)]
pub struct ParserOptions {
  pub strip_comments: bool,
  pub strip_code_blocks: bool,
  pub strip_metadata_blocks: bool,
}

fn count_sentences(input: &str) -> usize {
  input
    .split(|c| c == '.' || c == '?' || c == '!')
    .filter(|&s| !s.trim().is_empty())
    .count()
}

fn count_paragraphs(input: &str) -> usize {
  input.split("\n").filter(|&p| !p.trim().is_empty()).count()
}

fn count_characters_without_whitespace(input: &str) -> usize {
  input.chars().filter(|&c| !c.is_whitespace()).count()
}

fn add_count(text: &str, state: &mut ParserState) {
  state.counts.chars += text.len();
  state.counts.chars_no_whitespace += count_characters_without_whitespace(&text);
  state.counts.words += text.split_whitespace().count();
  state.counts.sentences += count_sentences(&text);
  state.counts.paragraphs += count_paragraphs(&text);
}

#[must_use]
pub fn count(markdown: &str, options: &ParserOptions) -> Counts {
  let mut pulldown_opts = Options::empty();
  pulldown_opts.insert(Options::ENABLE_STRIKETHROUGH);
  pulldown_opts.insert(Options::ENABLE_TABLES);
  pulldown_opts.insert(Options::ENABLE_FOOTNOTES);
  pulldown_opts.insert(Options::ENABLE_TASKLISTS);
  pulldown_opts.insert(Options::ENABLE_YAML_STYLE_METADATA_BLOCKS);

  let parser = TextMergeStream::new(Parser::new_ext(&markdown, pulldown_opts));
  let mut state = ParserState::new();

  // For each event we push into the buffer to produce the 'stripped' version.
  for event in parser {
    dbg!("{:?}", event.clone());
    match event {
      // The start and end events don't contain the text inside the tag. That's handled by the `Event::Text` arm.
      Event::Start(tag) => start_tag(&tag, &mut state),
      Event::End(tag) => end_tag(&tag, &mut state),
      Event::Text(text) => handle_text(&text, &mut state, &options),
      Event::Code(code) => handle_code(&code, &mut state, &options),
      Event::Html(_) => (),
      Event::FootnoteReference(_) => (),
      Event::TaskListMarker(_) => (),
      Event::SoftBreak | Event::HardBreak => fresh_line(&mut state),
      Event::Rule => fresh_line(&mut state),
      Event::InlineHtml(_) => (),
      Event::InlineMath(_) => (),
      Event::DisplayMath(_) => (),
    }
  }

  state.counts
}

fn start_tag(tag: &Tag, state: &mut ParserState) {
  match tag {
    Tag::CodeBlock { .. } => fresh_hard_break(state),
    Tag::List { .. } => fresh_line(state),
    Tag::Link { title, .. } | Tag::Image { title, .. } => {
      if !title.is_empty() {
        add_count(&title, state);
      }
    }
    Tag::Paragraph => (),
    Tag::Heading { .. } => (),
    Tag::Table { .. } => (),
    Tag::TableHead => (),
    Tag::TableRow => (),
    Tag::TableCell => (),
    Tag::BlockQuote(_) => (),
    Tag::Item => (),
    Tag::Emphasis => (),
    Tag::Strong => (),
    Tag::FootnoteDefinition { .. } => (),
    Tag::Strikethrough => (),
    Tag::HtmlBlock => (),
    Tag::MetadataBlock(_) => {
      state.is_metadata_block = true;
    }
    Tag::DefinitionList => (),
    Tag::DefinitionListTitle => (),
    Tag::DefinitionListDefinition => (),
  }
}

fn end_tag(tag: &TagEnd, state: &mut ParserState) {
  match tag {
    TagEnd::Paragraph => (),
    TagEnd::Table { .. } => fresh_line(state),
    TagEnd::TableHead => fresh_line(state),
    TagEnd::TableRow => fresh_line(state),
    TagEnd::Heading { .. } => fresh_line(state),
    TagEnd::Emphasis => (),
    TagEnd::TableCell => (),
    TagEnd::Strong => (),
    TagEnd::Link { .. } => (),
    TagEnd::BlockQuote(_) => fresh_line(state),
    TagEnd::CodeBlock { .. } => fresh_line(state),
    TagEnd::List { .. } => (),
    TagEnd::Item => fresh_line(state),
    TagEnd::Image { .. } => (), // shouldn't happen, handled in start
    TagEnd::FootnoteDefinition { .. } => (),
    TagEnd::Strikethrough => (),
    TagEnd::HtmlBlock => (),
    TagEnd::MetadataBlock(_) => {
      state.is_metadata_block = false;
    }
    TagEnd::DefinitionList => (),
    TagEnd::DefinitionListTitle => (),
    TagEnd::DefinitionListDefinition => (),
  }
}

fn fresh_line(state: &mut ParserState) {
  dbg!("Pushing \\n");
  add_count("\n", state);
}

fn fresh_hard_break(state: &mut ParserState) {
  dbg!("Pushing \\n\\n");
  add_count("\n\n", state);
}

fn handle_text(text: &CowStr<'_>, state: &mut ParserState, options: &ParserOptions) {
  if options.strip_metadata_blocks && state.is_metadata_block {
    return;
  };

  let mut parts = text.split("%%");

  let f = parts.next().unwrap();
  if !state.is_comment {
    dbg!("pushing {}", &f);
    add_count(&f, state);
  }

  for part in parts {
    state.is_comment = !state.is_comment;
    if !state.is_comment {
      dbg!("pushing {}", &part);
      add_count(part, state);
    }
  }
}

fn handle_code(code: &CowStr<'_>, state: &mut ParserState, options: &ParserOptions) {
  if options.strip_code_blocks {
    return;
  };
  dbg!("Pushing {}", &code);
  add_count(&code, state);
}
