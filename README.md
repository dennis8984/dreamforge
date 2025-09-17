# DreamForge - OpenArt.ai Clone with Nano Banana SDK

A production-ready AI art generation platform built with Google Gemini Nano Banana SDK, featuring subscription management, rate limiting, and premium model access.

## Features

- **AI Image Generation**: Powered by Google Gemini Nano Banana SDK with 94% text accuracy
- **Subscription Tiers**: Free, Basic ($9.99/mo), and Premium ($29.99/mo) plans
- **Model Gallery**: Browse and use various AI models with paywall protection
- **Image Modification**: Modify existing images using text prompts
- **Rate Limiting**: Different limits for free vs paid users
- **Caching**: Redis-based caching for improved performance
- **Payment Integration**: Stripe for secure payment processing
- **Real-time Updates**: WebSocket support for live generation updates

## Tech Stack

- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python), Celery for async tasks
- **AI Engine**: Google Gemini Nano Banana SDK (gemini-2.5-flash-image-preview)
- **Database**: PostgreSQL + Redis
- **Payments**: Stripe
- **Infrastructure**: Docker, AWS S3 for image storage

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Google Gemini API Key (Nano Banana SDK)
- Stripe Account (for payments)
- AWS Account (for S3 storage)

### Setup Instructions

1. **Clone the repository**
   ```bash
   cd dreamForge
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys:
   # - NANO_BANANA_API_KEY (Google Gemini)
   # - STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY
   # - AWS credentials
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Celery Flower (task monitoring): http://localhost:5555

### Manual Setup (Development)

#### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run database migrations
python -c "from database import init_db; init_db()"

# Start the backend
uvicorn main:app --reload --port 8000

# In another terminal, start Celery worker
celery -A celery_app worker --loglevel=info

# Optional: Start Celery Flower for monitoring
celery -A celery_app flower --port=5555
```

#### Frontend Setup
```bash
cd dreamforge-app
npm install
npm run dev
```

## Project Structure

```
dreamForge/
├── backend/
│   ├── main.py              # FastAPI main application
│   ├── database.py           # SQLAlchemy models
│   ├── ai_generator.py       # Nano Banana SDK integration
│   ├── auth.py              # Authentication logic
│   ├── rate_limiter.py      # Rate limiting implementation
│   ├── payment_service.py    # Stripe integration
│   ├── payment_routes.py     # Payment endpoints
│   ├── celery_app.py        # Async task configuration
│   └── requirements.txt      # Python dependencies
├── dreamforge-app/
│   ├── app/
│   │   └── page.tsx         # Main page
│   ├── components/
│   │   ├── Header.tsx       # Navigation header
│   │   ├── AIGallery.tsx    # Model gallery component
│   │   ├── GenerationPanel.tsx # Image generation UI
│   │   ├── ModelCard.tsx    # Individual model display
│   │   ├── AuthModal.tsx    # Login/Register modal
│   │   └── PaywallModal.tsx # Subscription upgrade modal
│   └── package.json         # Node dependencies
├── docker-compose.yml        # Docker orchestration
└── .env                     # Environment variables
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Models
- `GET /api/models` - List available AI models
- `GET /api/models/{model_id}/profile` - Get model details (with paywall check)

### Generation
- `POST /api/generate` - Generate image from text
- `POST /api/models/{model_id}/modify` - Modify existing image

### Subscription
- `GET /api/subscription/tiers` - Get available plans
- `POST /api/payment/checkout` - Create Stripe checkout session
- `POST /api/payment/webhook` - Stripe webhook handler
- `GET /api/payment/portal` - Customer portal link

### User
- `GET /api/user/gallery` - User's generated images
- `GET /api/user/usage` - Usage statistics

## Subscription Tiers

| Feature | Free | Basic ($9.99/mo) | Premium ($29.99/mo) |
|---------|------|------------------|---------------------|
| Generations/month | 5 | 100 | 500 |
| Basic models | ✅ | ✅ | ✅ |
| Premium models | ❌ | Limited | ✅ All |
| HD Downloads | ❌ | ✅ | ✅ |
| Priority queue | ❌ | ❌ | ✅ |
| API Access | ❌ | ❌ | ✅ |

## Development Workflow

1. **Adding new models**: Add to database via admin panel or seed script
2. **Adjusting rate limits**: Modify `RATE_LIMITS` in `rate_limiter.py`
3. **Customizing UI**: Edit components in `dreamforge-app/components/`
4. **Adding payment tiers**: Update `SubscriptionTier` table and Stripe products

## Production Deployment

### Using Vercel (Frontend)
```bash
cd dreamforge-app
vercel --prod
```

### Using AWS/Docker (Backend)
1. Build and push Docker image to ECR
2. Deploy using ECS or EC2
3. Configure RDS for PostgreSQL
4. Set up CloudFront CDN for images

## Security Considerations

- API keys are server-side only
- Rate limiting prevents abuse
- Content moderation for generated images
- HTTPS enforced in production
- Stripe webhooks use signature verification

## Testing

```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests
cd dreamforge-app
npm run test
```

## Monitoring

- Celery Flower for task monitoring
- Application logs in Docker containers
- Stripe Dashboard for payment tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Email: support@dreamforge.ai

## Acknowledgments

- Google Gemini team for the Nano Banana SDK
- Stripe for payment infrastructure
- The open-source community

---

Built with ❤️ using the Google Gemini Nano Banana Hackathon Kit