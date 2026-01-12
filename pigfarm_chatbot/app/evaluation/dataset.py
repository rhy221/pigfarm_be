"""
Evaluation dataset and test cases for RAG system
"""

# Sample test cases for evaluation
EVALUATION_DATASET = [
    {
        "question": "Có bao nhiêu con heo trong trang trại?",
        "expected_type": "sql",
        "expected_answer_contains": ["con heo", "tổng", "số"],
        "category": "inventory"
    },
    {
        "question": "Heo bị tiêu chảy thì điều trị như thế nào?",
        "expected_type": "rag",
        "expected_answer_contains": ["thuốc", "điều trị", "triệu chứng"],
        "category": "health"
    },
    {
        "question": "Lịch tiêm phòng cho heo con bao gồm những vaccine gì?",
        "expected_type": "rag",
        "expected_answer_contains": ["vaccine", "tiêm phòng", "lịch"],
        "category": "vaccination"
    },
    {
        "question": "Tổng chi phí thức ăn trong tháng này là bao nhiêu?",
        "expected_type": "sql",
        "expected_answer_contains": ["chi phí", "thức ăn", "tháng"],
        "category": "finance"
    },
    {
        "question": "Cách phòng ngừa bệnh dịch tả heo châu phi?",
        "expected_type": "rag",
        "expected_answer_contains": ["phòng ngừa", "dịch tả", "ASF"],
        "category": "health"
    },
    {
        "question": "Heo nào đang trong chuồng số 5?",
        "expected_type": "sql",
        "expected_answer_contains": ["chuồng", "5"],
        "category": "facility"
    },
    {
        "question": "Quy trình vệ sinh chuồng trại đúng cách?",
        "expected_type": "rag",
        "expected_answer_contains": ["vệ sinh", "chuồng", "quy trình"],
        "category": "sanitation"
    },
    {
        "question": "Doanh thu từ xuất heo trong quý này?",
        "expected_type": "sql",
        "expected_answer_contains": ["doanh thu", "xuất", "quý"],
        "category": "finance"
    },
]


def get_test_cases(category: str = None) -> list[dict]:
    """Get test cases, optionally filtered by category"""
    if category:
        return [tc for tc in EVALUATION_DATASET if tc["category"] == category]
    return EVALUATION_DATASET


def get_categories() -> list[str]:
    """Get all unique categories"""
    return list(set(tc["category"] for tc in EVALUATION_DATASET))
