# Video Kit

![Video Kit Hero](video-kit-hero.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A minimal, high-speed web UI for generating video via the kie.ai API - designed for AI filmmakers and creators who care about staying in flow.

## Features

- **AI Video Generation** - Transform images into 5-10 second video clips using Sora 2
- **Modern UI** - Clean, OpenAI-inspired interface with dark/light theme support
- **Dual View Modes** - Switch between large embed player and list feed views
- **Real-time Tracking** - Live status updates as your videos generate
- **Prompt History** - Full-screen history view to reuse previous prompts
- **Smart Settings** - Configurable orientation, duration, and prompt modifiers
- **One-Click Downloads** - Save videos directly to your Downloads folder
- **Cost Transparency** - See estimated costs for each generation (~$0.30/5sec)

## Screenshots

### Embed View (Dark Mode)
Large centered video player with prev/next navigation for browsing generated videos.

### List View
Feed of all generations with thumbnails, status badges, and quick actions via three-dot menu.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Axios, CSS Variables |
| Backend | FastAPI, Uvicorn, Async/Await |
| Video Processing | OpenCV (thumbnail extraction) |
| AI API | Kie.ai Sora 2 Image-to-Video |
| Storage | JSON files, Local filesystem |

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 14+
- [Kie.ai API key](https://kie.ai)

### Installation

```bash
# Clone the repository
git clone https://github.com/mageframe/video-kit.git
cd video-kit

# Install backend dependencies
cd backend
pip3 install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install

# Create data directories
cd ..
mkdir -p data/fighters data/videos data/custom-images
```

### Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Kie.ai API key:

```
KIE_API_KEY=your_kie_api_key_here
```

### Running

**Terminal 1 - Backend:**
```bash
cd backend
export DATA_PATH="../data"
export KIE_API_KEY="your_api_key"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
REACT_APP_API_URL=http://localhost:8000 npm start
```

**Access:**
- App: http://localhost:3000
- API Docs: http://localhost:8000/docs

## Usage

1. **Upload an Image** - Click the + button in the left gallery to upload a reference image
2. **Write a Prompt** - Describe what you want to happen in the video
3. **Configure Settings** - Click the settings icon to adjust:
   - **Orientation**: Landscape (16:9) or Portrait (9:16)
   - **Duration**: 10 or 15 seconds
   - **Modifiers**: No music, No crowd, No commentators, Like anime
4. **Generate** - Click the generate button and watch real-time progress
5. **View & Download** - Play your video and download with one click

## Project Structure

```
video-kit/
├── backend/
│   ├── app/
│   │   ├── api/           # REST endpoints
│   │   │   ├── generate.py
│   │   │   ├── jobs.py
│   │   │   ├── fighters.py
│   │   │   ├── custom_images.py
│   │   │   └── env.py
│   │   ├── models/        # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   │   ├── kie_client.py    # Kie.ai API client
│   │   │   └── job_manager.py   # Job lifecycle
│   │   └── main.py        # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── InputPanel.js
│   │   │   ├── OutputPanel.js
│   │   │   ├── ImageGallery.js
│   │   │   ├── SettingsPopup.js
│   │   │   └── ...
│   │   ├── assets/icons/  # SVG icons
│   │   ├── services/api.js
│   │   └── App.js
│   └── package.json
├── data/                  # Local storage (gitignored)
│   ├── videos/            # Generated videos
│   ├── custom-images/     # Uploaded images
│   └── jobs.json          # Job history
└── plan.md               # Implementation notes
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate` | Submit video generation job |
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/{id}` | Get job status |
| DELETE | `/api/jobs/{id}` | Delete a job |
| POST | `/api/custom-images/upload` | Upload reference image |
| GET | `/api/custom-images` | List uploaded images |
| DELETE | `/api/custom-images/{id}` | Delete uploaded image |

Full interactive documentation available at `/docs` when the backend is running.

## Cost Estimates

| Duration | Estimated Cost |
|----------|---------------|
| 5 seconds | ~$0.30 |
| 10 seconds | ~$0.60 |

*Kie.ai pricing is typically 30-50% cheaper than official APIs. Actual costs may vary.*

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KIE_API_KEY` | Yes | - | Your Kie.ai API key |
| `DATA_PATH` | No | `../data` | Path to data storage |
| `ENVIRONMENT` | No | `development` | Environment mode |
| `REACT_APP_API_URL` | No | - | Backend URL for frontend |

### Video Generation Options

| Option | Values | Description |
|--------|--------|-------------|
| Orientation | `landscape`, `portrait` | 16:9 or 9:16 aspect ratio |
| Duration | `10`, `15` | Video length in seconds |
| Modifiers | Various | Append instructions to prompt |

## Known Limitations

- **No Authentication** - Designed for local/personal use
- **JSON Storage** - Uses flat files, not a database
- **Single Model** - Currently only supports Sora 2
- **No Webhooks** - Uses polling for status updates

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Kie.ai](https://kie.ai) - AI API aggregation platform
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - UI library
- [OpenCV](https://opencv.org/) - Video processing
