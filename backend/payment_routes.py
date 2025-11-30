"""
Payment Routes for Paydunya Integration
Handles payment invoice creation, verification, and webhooks.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
import logging
import hashlib
import hmac
import os

from database import get_database
from auth import get_current_user
from models import User, UserRole
from paydunya_service import get_paydunya_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])


# Request/Response Models
class PaymentChannelEnum:
    CARD = "card"
    ORANGE_MONEY_SENEGAL = "orange-money-senegal"
    WAVE_SENEGAL = "wave-senegal"
    ORANGE_MONEY_CI = "orange-money-ci"
    WAVE_CI = "wave-ci"


class CreatePaymentRequest(BaseModel):
    task_id: str
    amount: float = Field(gt=0, description="Amount in XOF")
    description: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    channels: Optional[List[str]] = None
    return_url: Optional[str] = None
    cancel_url: Optional[str] = None


class PaymentResponse(BaseModel):
    success: bool
    payment_url: Optional[str] = None
    payment_token: Optional[str] = None
    payment_id: Optional[str] = None
    error: Optional[str] = None


class VerifyPaymentResponse(BaseModel):
    success: bool
    status: Optional[str] = None
    amount: Optional[float] = None
    receipt_url: Optional[str] = None
    error: Optional[str] = None


@router.post("/create-invoice", response_model=PaymentResponse)
async def create_payment_invoice(
    payment_request: CreatePaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create a Paydunya payment invoice.
    Only clients can create payment invoices.
    """
    try:
        # Verify user is a client
        if current_user.role != UserRole.CLIENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only clients can create payment invoices"
            )
        
        # Verify task exists and belongs to the client
        task = await db.tasks.find_one({"id": payment_request.task_id}, {"_id": 0})
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        if task.get("client_id") != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Task does not belong to you"
            )
        
        # Check if task is completed
        if task.get("status") != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task must be completed before payment"
            )
        
        # Check if already paid
        if task.get("is_paid"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task is already paid"
            )
        
        # Create invoice with Paydunya
        paydunya_service = get_paydunya_service()
        
        success, response = paydunya_service.create_invoice(
            amount=payment_request.amount,
            description=payment_request.description,
            customer_name=payment_request.customer_name,
            customer_email=payment_request.customer_email,
            customer_phone=payment_request.customer_phone,
            task_id=payment_request.task_id,
            channels=payment_request.channels,
            return_url=payment_request.return_url,
            cancel_url=payment_request.cancel_url
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=response.get("error", "Failed to create payment invoice")
            )
        
        # Store payment record in database
        payment_record = {
            "payment_id": response["token"],
            "task_id": payment_request.task_id,
            "client_id": current_user.id,
            "tasker_id": task.get("assigned_tasker_id"),
            "amount": payment_request.amount,
            "currency": "XOF",
            "status": "pending",
            "payment_method": "paydunya",
            "paydunya_token": response["token"],
            "payment_url": response["response_text"],
            "customer_name": payment_request.customer_name,
            "customer_email": payment_request.customer_email,
            "customer_phone": payment_request.customer_phone,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.paydunya_payments.insert_one(payment_record)
        
        logger.info(f"Payment invoice created for task {payment_request.task_id}")
        
        return PaymentResponse(
            success=True,
            payment_url=response["response_text"],
            payment_token=response["token"],
            payment_id=response["token"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payment invoice: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment invoice"
        )


@router.get("/verify/{payment_token}", response_model=VerifyPaymentResponse)
async def verify_payment(
    payment_token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Verify payment status after user completes payment.
    """
    try:
        # Get payment record
        payment = await db.paydunya_payments.find_one(
            {"paydunya_token": payment_token},
            {"_id": 0}
        )
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        # Verify payment with Paydunya
        paydunya_service = get_paydunya_service()
        success, response = paydunya_service.verify_payment(payment_token)
        
        if not success:
            return VerifyPaymentResponse(
                success=False,
                error=response.get("error", "Payment verification failed")
            )
        
        payment_status = response.get("status", "unknown")
        
        # Update payment record
        await db.paydunya_payments.update_one(
            {"paydunya_token": payment_token},
            {
                "$set": {
                    "status": payment_status,
                    "updated_at": datetime.utcnow(),
                    "verification_response": response
                }
            }
        )
        
        # If payment is completed, update task
        if payment_status == "completed":
            await db.tasks.update_one(
                {"id": payment.get("task_id")},
                {
                    "$set": {
                        "is_paid": True,
                        "payment_method": "paydunya",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            logger.info(f"Task {payment.get('task_id')} marked as paid via Paydunya")
        
        return VerifyPaymentResponse(
            success=True,
            status=payment_status,
            amount=response.get("total_amount"),
            receipt_url=response.get("receipt_url")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify payment"
        )


@router.post("/webhook/paydunya-ipn")
async def paydunya_ipn_webhook(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Webhook endpoint for Paydunya IPN (Instant Payment Notification).
    Paydunya calls this endpoint when payment status changes.
    """
    try:
        # Get form data from Paydunya
        form_data = await request.form()
        
        logger.info(f"Received IPN webhook: {dict(form_data)}")
        
        # Log the webhook for debugging
        await db.paydunya_webhooks.insert_one({
            "data": dict(form_data),
            "created_at": datetime.utcnow()
        })
        
        # Extract payment information
        # Paydunya sends data in different formats depending on the event
        # We'll handle it based on available fields
        
        # Try to extract token from various possible fields
        token = form_data.get("invoice_token") or form_data.get("token")
        
        if token:
            payment = await db.paydunya_payments.find_one(
                {"paydunya_token": token},
                {"_id": 0}
            )
            
            if payment:
                # Update payment status based on webhook data
                payment_status = form_data.get("status", "unknown")
                
                await db.paydunya_payments.update_one(
                    {"paydunya_token": token},
                    {
                        "$set": {
                            "status": payment_status,
                            "updated_at": datetime.utcnow(),
                            "ipn_data": dict(form_data)
                        }
                    }
                )
                
                # If completed, update task
                if payment_status == "completed":
                    await db.tasks.update_one(
                        {"id": payment.get("task_id")},
                        {
                            "$set": {
                                "is_paid": True,
                                "payment_method": "paydunya",
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                
                logger.info(f"IPN processed for token {token}, status: {payment_status}")
        
        # Always return success to acknowledge receipt
        return {"success": True, "message": "IPN received"}
    
    except Exception as e:
        logger.error(f"Error processing IPN: {str(e)}", exc_info=True)
        # Still return success to prevent retries
        return {"success": False, "error": str(e)}


@router.get("/history")
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get payment history for the current user."""
    try:
        # Build query based on user role
        if current_user.role == UserRole.CLIENT:
            query = {"client_id": current_user.id}
        elif current_user.role == UserRole.TASKER:
            query = {"tasker_id": current_user.id}
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid user role"
            )
        
        payments = await db.paydunya_payments.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {"success": True, "payments": payments}
    
    except Exception as e:
        logger.error(f"Error fetching payment history: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch payment history"
        )
