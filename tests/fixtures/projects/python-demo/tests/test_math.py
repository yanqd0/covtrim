from src.math import add, mul


def test_add():
    assert add(1, 2) == 3


def test_mul():
    assert mul(3, 4) == 12
# div 未测 → src/math.py 部分覆盖（uncovered > 0）
