from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from database import get_db, User, SubscriptionTier
from auth import get_current_active_user
from payment_service import PaymentService

router = APIRouter(prefix="/api/payment", tags=["payment"])
payment_service = PaymentService()

@router.post("/checkout")
async def create_checkout(
    tier: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create Stripe checkout session"""
    if tier not in ['basic', 'premium']:
        raise HTTPException(status_code=400, detail="Invalid subscription tier")

    if not current_user.stripe_customer_id:
        customer = await payment_service.create_customer(
            current_user.email,
            current_user.full_name
        )
        current_user.stripe_customer_id = customer["id"]
        db.commit()

    tier_info = db.query(SubscriptionTier).filter(SubscriptionTier.name == tier).first()
    if not tier_info or not tier_info.stripe_price_id:
        price_id = payment_service.products.get(tier).id if tier in payment_service.products else None
        if not price_id:
            raise HTTPException(status_code=400, detail="Price not found")
    else:
        price_id = tier_info.stripe_price_id

    checkout_url = await payment_service.create_checkout_session(
        price_id,
        str(current_user.id),
        current_user.stripe_customer_id
    )

    return {"checkout_url": checkout_url}

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    if not sig_header:
        raise HTTPException(status_code=400, detail="No signature header")

    result = await payment_service.handle_webhook(payload, sig_header, db)
    return result

@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel current subscription"""
    if current_user.subscription_tier == 'free':
        raise HTTPException(status_code=400, detail="No active subscription")

    success = await payment_service.cancel_subscription(current_user.stripe_customer_id)

    if success:
        return {"message": "Subscription will be canceled at the end of the billing period"}
    else:
        raise HTTPException(status_code=400, detail="Failed to cancel subscription")

@router.get("/portal")
async def customer_portal(
    current_user: User = Depends(get_current_active_user)
):
    """Get customer portal URL"""
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer found")

    portal_url = await payment_service.create_portal_session(current_user.stripe_customer_id)
    return {"portal_url": portal_url}