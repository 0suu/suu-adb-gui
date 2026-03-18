use serde::Serialize;
use std::fmt;

/// アプリケーション共通のエラー型
#[derive(Debug, Serialize, Clone)]
pub struct AppError {
    pub message: String,
    pub kind: ErrorKind,
}

#[derive(Debug, Serialize, Clone)]
pub enum ErrorKind {
    AdbNotFound,
    AdbExecution,
    DeviceOffline,
    DeviceUnauthorized,
    Timeout,
    ParseError,
    IoError,
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}: {}", self.kind, self.message)
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError {
            message: e.to_string(),
            kind: ErrorKind::IoError,
        }
    }
}

impl AppError {
    pub fn adb_execution(msg: impl Into<String>) -> Self {
        AppError {
            message: msg.into(),
            kind: ErrorKind::AdbExecution,
        }
    }

    pub fn timeout(msg: impl Into<String>) -> Self {
        AppError {
            message: msg.into(),
            kind: ErrorKind::Timeout,
        }
    }

    pub fn parse(msg: impl Into<String>) -> Self {
        AppError {
            message: msg.into(),
            kind: ErrorKind::ParseError,
        }
    }
}
