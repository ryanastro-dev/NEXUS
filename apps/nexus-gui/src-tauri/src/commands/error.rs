use std::fmt;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

pub(crate) type CommandResult<T> = Result<T, CommandError>;

impl CommandError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }

    pub fn invalid_input(message: impl Into<String>) -> Self {
        Self::new("invalid_input", message)
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::new("internal_error", message)
    }
}

impl fmt::Display for CommandError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for CommandError {}

impl From<String> for CommandError {
    fn from(message: String) -> Self {
        CommandError::internal(message)
    }
}

impl From<&str> for CommandError {
    fn from(message: &str) -> Self {
        CommandError::internal(message)
    }
}

impl From<rusqlite::Error> for CommandError {
    fn from(error: rusqlite::Error) -> Self {
        CommandError::internal(error.to_string())
    }
}

impl From<std::io::Error> for CommandError {
    fn from(error: std::io::Error) -> Self {
        CommandError::internal(error.to_string())
    }
}
