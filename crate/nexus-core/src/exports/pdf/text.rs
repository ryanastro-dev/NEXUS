pub(super) fn truncate_for_row(value: &str, max_len: usize) -> String {
    if value.chars().count() <= max_len {
        return value.to_string();
    }
    let mut out = value
        .chars()
        .take(max_len.saturating_sub(3))
        .collect::<String>();
    out.push_str("...");
    out
}

pub(super) fn wrap_text(value: &str, max_chars: usize) -> Vec<String> {
    if max_chars == 0 {
        return vec![value.to_string()];
    }

    let mut lines = Vec::new();
    let mut current = String::new();

    for word in value.split_whitespace() {
        let word_len = word.chars().count();
        let current_len = current.chars().count();

        if current_len == 0 {
            if word_len <= max_chars {
                current.push_str(word);
            } else {
                let chars: Vec<char> = word.chars().collect();
                for chunk in chars.chunks(max_chars) {
                    lines.push(chunk.iter().collect());
                }
            }
            continue;
        }

        if current_len + 1 + word_len <= max_chars {
            current.push(' ');
            current.push_str(word);
            continue;
        }

        lines.push(std::mem::take(&mut current));
        if word_len <= max_chars {
            current.push_str(word);
        } else {
            let chars: Vec<char> = word.chars().collect();
            for chunk in chars.chunks(max_chars) {
                lines.push(chunk.iter().collect());
            }
        }
    }

    if !current.is_empty() {
        lines.push(current);
    }

    if lines.is_empty() {
        lines.push(String::new());
    }

    lines
}
