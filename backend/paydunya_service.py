"""
Paydunya Payment Service
Handles all interactions with Paydunya payment gateway for Orange Money, Wave, and Card payments.
"""

import paydunya
from paydunya import InvoiceItem, Store
import os
from typing import Dict, Tuple, Optional, List
import logging

logger = logging.getLogger(__name__)


class PayDunyaService:
    """Service for handling Paydunya payment operations."""
    
    def __init__(self):
        """Initialize Paydunya with API keys from environment."""
        self.master_key = os.environ.get('PAYDUNYA_MASTER_KEY', '')
        self.private_key = os.environ.get('PAYDUNYA_PRIVATE_KEY', '')
        self.token = os.environ.get('PAYDUNYA_TOKEN', '')
        self.mode = os.environ.get('PAYDUNYA_MODE', 'test')
        
        # Configure Paydunya
        paydunya.debug = self.mode == 'test'
        paydunya.api_keys = {
            'master_key': self.master_key,
            'private_key': self.private_key,
            'token': self.token
        }
        
        logger.info(f"Paydunya initialized in {self.mode} mode")
    
    def create_invoice(
        self,
        amount: float,
        description: str,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        task_id: str,
        channels: Optional[List[str]] = None,
        return_url: Optional[str] = None,
        cancel_url: Optional[str] = None
    ) -> Tuple[bool, Dict]:
        """
        Create a payment invoice with Paydunya.
        
        Args:
            amount: Payment amount in XOF (West African CFA franc)
            description: Payment description
            customer_name: Customer's full name
            customer_email: Customer's email address
            customer_phone: Customer's phone number
            task_id: Reference task ID
            channels: Payment channels to enable (e.g., ['card', 'orange-money-senegal', 'wave-senegal'])
            return_url: URL to redirect after successful payment
            cancel_url: URL to redirect if payment is cancelled
            
        Returns:
            Tuple of (success: bool, response: dict)
        """
        try:
            # Create store information
            store = Store(name="TaskAfy")
            
            # Create invoice
            invoice = paydunya.Invoice(store)
            
            # Set invoice details
            invoice.total_amount = int(amount)
            invoice.description = description
            
            # Add custom data for reference
            invoice.add_custom_data([
                ("task_id", task_id),
                ("customer_name", customer_name),
                ("customer_email", customer_email),
                ("customer_phone", customer_phone)
            ])
            
            # Set payment channels if provided
            if channels:
                invoice.add_channels(channels)
            else:
                # Default channels for Senegal and Ivory Coast
                invoice.add_channels([
                    "card",
                    "orange-money-senegal",
                    "wave-senegal",
                    "orange-money-ci",
                    "wave-ci"
                ])
            
            # Set return and cancel URLs if provided
            if return_url:
                invoice.return_url = return_url
            if cancel_url:
                invoice.cancel_url = cancel_url
            
            # Create the invoice
            successful, response = invoice.create()
            
            if successful:
                logger.info(f"Invoice created successfully for task {task_id}")
                return True, {
                    "token": response.get("token"),
                    "response_text": response.get("response_text"),
                    "response_code": response.get("response_code"),
                    "description": response.get("description")
                }
            else:
                logger.error(f"Failed to create invoice: {response}")
                return False, {
                    "error": response.get("response_text", "Invoice creation failed"),
                    "response_code": response.get("response_code")
                }
        
        except Exception as e:
            logger.error(f"Exception creating invoice: {str(e)}", exc_info=True)
            return False, {"error": str(e)}
    
    def verify_payment(self, token: str) -> Tuple[bool, Dict]:
        """
        Verify payment status using the payment token.
        
        Args:
            token: Paydunya payment token
            
        Returns:
            Tuple of (success: bool, response: dict)
        """
        try:
            store = Store(name="TaskAfy")
            invoice = paydunya.Invoice(store)
            
            successful, response = invoice.confirm(token)
            
            if successful:
                logger.info(f"Payment verified successfully for token {token}")
                return True, {
                    "status": response.get("status"),
                    "invoice_token": response.get("invoice", {}).get("token"),
                    "total_amount": response.get("invoice", {}).get("total_amount"),
                    "customer": response.get("customer", {}),
                    "receipt_url": response.get("receipt_url")
                }
            else:
                logger.warning(f"Payment verification failed for token {token}")
                return False, {
                    "error": "Payment verification failed",
                    "response": response
                }
        
        except Exception as e:
            logger.error(f"Exception verifying payment: {str(e)}", exc_info=True)
            return False, {"error": str(e)}


# Singleton instance
_paydunya_service = None


def get_paydunya_service() -> PayDunyaService:
    """Get or create the Paydunya service singleton."""
    global _paydunya_service
    if _paydunya_service is None:
        _paydunya_service = PayDunyaService()
    return _paydunya_service
