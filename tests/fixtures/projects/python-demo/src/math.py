"""纯函数：covtrim python 封装的覆盖率目标（div 含 if 分支未测 → 部分覆盖）。"""


def add(a, b):
    return a + b


def mul(a, b):
    return a * b


def div(a, b):
    if b == 0:
        raise ValueError("div by zero")
    return a / b
