import stripe
import os
from typing import Dict, Optional
from datetime import datetime, timedelta
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
from database import User, SubscriptionTier
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
DOMAIN = os.getenv("DOMAIN", "http://localhost:3000")

class PaymentService:
    def __init__(self):
        self.products = self.setup_products()

    def setup_products(self) -> Dict:
        """Create or retrieve Stripe products and prices"""
        products = {}

        try:
            basic_product = stripe.Product.create(
                name="DreamForge Basic",
                description="Basic AI Art Generation Access"
            )

            products['basic'] = stripe.Price.create(
                unit_amount=999,
                currency='usd',
                recurring={'interval': 'month'},
                product=basic_product.id,
                metadata={'tier': 'basic'}
            )

            premium_product = stripe.Product.create(
                name="DreamForge Premium",
                description="Full Access to All AI Models"
            )

            products['premium'] = stripe.Price.create(
                unit_amount=2999,
                currency='usd',
                recurring={'interval': 'month'},
                product=premium_product.id,
                metadata={'tier': 'premium'}
            )
        except stripe.error.StripeError as e:
            print(f"Error setting up Stripe products: {e}")

        return products

    async def create_customer(self, email: str, name: Optional[str] = None) -> Dict:
        """Create a Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={'platform': 'dreamforge'}
            )
            return {"id": customer.id, "email": customer.email}
        except stripe.error.StripeError as e:
            print(f"Error creating Stripe customer: {e}")
            return {"id": None, "email": email}

    async def create_checkout_session(self, price_id: str, user_id: str, customer_id: str) -> str:
        """Create Stripe checkout session for subscription"""
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=f'{DOMAIN}/success?session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'{DOMAIN}/pricing',
                customer=customer_id,
                client_reference_id=user_id,
                subscription_data={
                    'trial_period_days': 7,
                    'metadata': {
                        'user_id': user_id
                    }
                }
            )
            return session.url
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def cancel_subscription(self, subscription_id: str) -> bool:
        """Cancel a subscription"""
        try:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
            return True
        except stripe.error.StripeError as e:
            print(f"Error canceling subscription: {e}")
            return False

    async def handle_webhook(self, payload: bytes, sig_header: str, db: Session) -> Dict:
        """Handle Stripe webhook events"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")

        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            user_id = session['client_reference_id']
            subscription_id = session['subscription']

            user = db.query(User).filter(User.id == user_id).first()
            if user:
                subscription = stripe.Subscription.retrieve(subscription_id)
                price_id = subscription['items']['data'][0]['price']['id']

                tier = 'free'
                for tier_name, price in self.products.items():
                    if price.id == price_id:
                        tier = tier_name
                        break

                user.subscription_tier = tier
                user.subscription_active = True
                user.subscription_end_date = datetime.fromtimestamp(
                    subscription['current_period_end']
                )
                db.commit()

        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            customer_id = subscription['customer']

            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
            if user:
                user.subscription_tier = 'free'
                user.subscription_active = False
                user.subscription_end_date = None
                db.commit()

        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            customer_id = subscription['customer']

            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
            if user:
                if subscription['status'] == 'active':
                    user.subscription_active = True
                    user.subscription_end_date = datetime.fromtimestamp(
                        subscription['current_period_end']
                    )
                else:
                    user.subscription_active = False

                db.commit()

        return {"status": "success", "event_type": event['type']}

    async def create_portal_session(self, customer_id: str) -> str:
        """Create customer portal session for managing subscription"""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f'{DOMAIN}/account'
            )
            return session.url
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=str(e))

    def check_subscription_access(self, user: User, feature: str) -> bool:
        """Check if user has access to a specific feature"""
        tier_features = {
            'free': ['basic_models', 'limited_generations'],
            'basic': ['basic_models', 'premium_models', 'more_generations', 'download_hd'],
            'premium': ['all_features', 'unlimited_generations', 'priority_queue', 'api_access']
        }

        user_features = tier_features.get(user.subscription_tier, tier_features['free'])

        feature_map = {
            'premium_models': ['basic', 'premium'],
            'unlimited': ['premium'],
            'api': ['premium'],
            'download_hd': ['basic', 'premium']
        }

        allowed_tiers = feature_map.get(feature, [])
        return user.subscription_tier in allowed_tiers or 'all_features' in user_features