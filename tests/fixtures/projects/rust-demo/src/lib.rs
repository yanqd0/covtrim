//! 纯函数：covtrim rust 封装的覆盖率目标（div 故意未测 → 部分覆盖）。

/// 加法。
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// 乘法。
pub fn mul(a: i32, b: i32) -> i32 {
    a * b
}

/// 除法（b==0 时 panic，分支未测）。
pub fn div(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("div by zero");
    }
    a / b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_works() {
        assert_eq!(add(1, 2), 3);
    }

    #[test]
    fn mul_works() {
        assert_eq!(mul(3, 4), 12);
    }
}
