from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from backend.database import init_db, get_db, Product, Reservation, Sale, Expense, User
from backend.schemas import (
    ProductCreate, ProductUpdate, ProductResponse,
    ReservationCreate, ReservationResponse,
    SaleCreate, SaleResponse,
    ExpenseCreate, ExpenseResponse,
    FinancialReport
)

app = FastAPI(title="LogisticBTW API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yankibtw.github.io",  # ← Ваш GitHub Pages
        "http://localhost:8000",        # ← Для тестов
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализация БД при старте
@app.on_event("startup")
async def startup():
    init_db()

# ==================== ТОВАРЫ ====================

@app.post("/api/products", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    db_product = Product(
        id=str(uuid.uuid4()),
        **product.dict()
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.get("/api/products", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()

@app.get("/api/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.put("/api/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: str, product: ProductUpdate, db: Session = Depends(get_db)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_product, key, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/api/products/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(db_product)
    db.commit()
    return {"message": "Product deleted"}

# ==================== БРОНИРОВАНИЯ ====================

@app.post("/api/reservations", response_model=ReservationResponse)
def create_reservation(reservation: ReservationCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == reservation.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Проверка доступности
    current_reserved = db.query(Reservation).filter(
        Reservation.product_id == reservation.product_id
    ).all()
    total_reserved = sum(r.qty for r in current_reserved)
    
    if total_reserved + reservation.qty > product.total_qty:
        raise HTTPException(
            status_code=400, 
            detail=f"Недостаточно товара! Свободно: {product.total_qty - total_reserved}"
        )
    
    db_reservation = Reservation(
        id=str(uuid.uuid4()),
        **reservation.dict()
    )
    db.add(db_reservation)
    
    # Обновляем reserved_qty
    product.reserved_qty = sum(r.qty for r in product.reservations) + reservation.qty
    db.commit()
    db.refresh(db_reservation)
    return db_reservation

@app.get("/api/products/{product_id}/reservations", response_model=List[ReservationResponse])
def get_reservations(product_id: str, db: Session = Depends(get_db)):
    return db.query(Reservation).filter(Reservation.product_id == product_id).all()

@app.delete("/api/reservations/{reservation_id}")
def delete_reservation(reservation_id: str, db: Session = Depends(get_db)):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    product_id = reservation.product_id
    db.delete(reservation)
    
    # Пересчитываем reserved_qty
    product = db.query(Product).filter(Product.id == product_id).first()
    if product:
        product.reserved_qty = sum(r.qty for r in product.reservations)
    
    db.commit()
    return {"message": "Reservation deleted"}

# ==================== ПРОДАЖИ ====================

@app.post("/api/sales", response_model=SaleResponse)
def create_sale(sale: SaleCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == sale.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Проверка доступности (учитываем бронь и уже проданные)
    reserved = product.reserved_qty
    sold = db.query(Sale).filter(Sale.product_id == sale.product_id).all()
    total_sold = sum(s.qty for s in sold)
    available = product.total_qty - reserved - total_sold
    
    if sale.qty > available:
        raise HTTPException(
            status_code=400,
            detail=f"Недостаточно товара! Свободно: {available}"
        )
    
    db_sale = Sale(
        id=str(uuid.uuid4()),
        total=sale.qty * sale.price,
        **sale.dict()
    )
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    return db_sale

@app.get("/api/sales", response_model=List[SaleResponse])
def get_sales(month: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Sale)
    if month:
        query = query.filter(Sale.date.startswith(month))
    return query.order_by(Sale.date.desc()).all()

@app.delete("/api/sales/{sale_id}")
def delete_sale(sale_id: str, db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    db.delete(sale)
    db.commit()
    return {"message": "Sale deleted"}

# ==================== РАСХОДЫ ====================

@app.post("/api/expenses", response_model=ExpenseResponse)
def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db)):
    db_expense = Expense(
        id=str(uuid.uuid4()),
        **expense.dict()
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@app.get("/api/expenses", response_model=List[ExpenseResponse])
def get_expenses(month: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Expense)
    if month:
        query = query.filter(Expense.date.startswith(month))
    return query.order_by(Expense.date.desc()).all()

@app.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: str, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted"}

# ==================== ОТЧЁТЫ ====================

@app.get("/api/reports/financial")
def get_financial_report(month: Optional[str] = None, db: Session = Depends(get_db)):
    # Продажи
    sales_query = db.query(Sale)
    if month:
        sales_query = sales_query.filter(Sale.date.startswith(month))
    sales = sales_query.all()
    total_income = sum(s.total for s in sales)
    
    # Расходы
    expenses_query = db.query(Expense)
    if month:
        expenses_query = expenses_query.filter(Expense.date.startswith(month))
    expenses = expenses_query.all()
    total_expenses = sum(e.amount for e in expenses)
    
    profit = total_income - total_expenses
    roi = ((profit / total_expenses) * 100) if total_expenses > 0 else 0
    
    return {
        "month": month or "all",
        "total_income": total_income,
        "total_expenses": total_expenses,
        "profit": profit,
        "roi": round(roi, 2),
        "sales_count": len(sales),
        "expenses_count": len(expenses)
    }

# Health check
@app.get("/api/health")
def health_check():

    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
