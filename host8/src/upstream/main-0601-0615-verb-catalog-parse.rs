    for line in body.split('\n') {
        if !line.contains("|entry=") {
            continue;
        }
        // first `|entry=...|` occurrence; capture up to the next `|`.
        if let Some(start) = line.find("|entry=") {
            let after = &line[start + "|entry=".len()..];
            if let Some(end) = after.find('|') {
                let verb = &after[..end];
                if !verb.is_empty() {
                    verbs.push(verb.to_string());
                }
            }
        }
    }
