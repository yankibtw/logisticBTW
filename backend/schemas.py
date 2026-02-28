from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ==================== ТОВАРЫ ====================

class ProductBase(BaseModel):
    name: str
    total_qty: int = 0
    transit_qty: int = 0

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    total_qty: Optional[int] = None
    transit_qty: Optional[int] = None

class ProductResponse(ProductBase):
    id: str
    reserved_qty: int = 0
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ==================== БРОНИРОВАНИЯ ====================

class ReservationBase(BaseModel):
    client_name: str
    qty: int
    date: Optional[str] = None
    link: Optional[str] = None
    comment: Optional[str] = None

class ReservationCreate(ReservationBase):
    product_id: str

class ReservationResponse(ReservationBase):
    id: str
    product_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==================== ПРОДАЖИ ====================

class SaleBase(BaseModel):
    qty: int = Field(ge=1)
    price: float = Field(ge=0)
    date: str
    customer: Optional[str] = None
    comment: Optional[str] = None

class SaleCreate(SaleBase):
    product_id: str

class SaleResponse(SaleBase):
    id: str
    product_id: str
    total: float
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==================== РАСХОДЫ ====================

class ExpenseBase(BaseModel):
    category: str
    category_label: str
    amount: float = Field(gt=0)
    date: str
    description: str
    product_id: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==================== ОТЧЁТЫ ====================

class FinancialReport(BaseModel):
    month: str
    total_income: float
    total_expenses: float
    profit: float
    roi: float
    sales_count: int
    expenses_count: int