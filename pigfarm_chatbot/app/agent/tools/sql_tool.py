from langchain_core.tools import tool
from typing import Any
import json

from app.db.database import execute_read_query
from app.agent.prompts import SQL_TOOL_DESCRIPTION


@tool
async def query_farm_database(sql_query: str) -> str:
    """
    Thực thi câu lệnh SQL SELECT trên database trang trại để truy vấn dữ liệu.
    
    Công cụ này dùng để:
    - Đếm số lượng heo (COUNT)
    - Lấy thông tin heo (tên, trạng thái, chuồng, v.v.)
    - Tra cứu dữ liệu tài chính (chi phí, doanh thu)
    - Kiểm tra tồn kho thức ăn
    - Lịch sử vaccine
    
    Args:
        sql_query: Câu lệnh SQL SELECT (chỉ cho phép đọc dữ liệu, không được INSERT/UPDATE/DELETE)
    
    Returns:
        str: Kết quả truy vấn dưới dạng text
    """
    try:
        # Execute query with safety checks (inside execute_read_query)
        results = await execute_read_query(sql_query)
        
        if not results:
            return "Không tìm thấy dữ liệu nào phù hợp với truy vấn."
        
        # Format results
        if len(results) == 1 and len(results[0]) == 1:
            # Single value result (e.g., COUNT)
            key = list(results[0].keys())[0]
            return f"{key}: {results[0][key]}"
        
        # Multiple results - format as table
        if len(results) <= 20:
            # Small result set - show all
            return json.dumps(results, ensure_ascii=False, indent=2, default=str)
        else:
            # Large result set - summarize
            summary = f"Tìm thấy {len(results)} kết quả. Hiển thị 10 kết quả đầu tiên:\n"
            summary += json.dumps(results[:10], ensure_ascii=False, indent=2, default=str)
            return summary
            
    except ValueError as e:
        return f"Lỗi: {str(e)}. Chỉ cho phép câu lệnh SELECT."
    except Exception as e:
        return f"Lỗi khi thực thi truy vấn: {str(e)}"


# Export the tool
sql_tool = query_farm_database
sql_tool.description = SQL_TOOL_DESCRIPTION
