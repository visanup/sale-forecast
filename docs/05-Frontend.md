## Frontend (React + TypeScript + Vite + Tailwind)

Document ID: FE-05

Scope: Theme, project structure, environment, API usage conventions, logging integration

Audience: Frontend engineers

**Theme**: Beautiful, premium, professional with modern UX

## 🛠️ Technology Stack

### Core Technologies
- **React 18**: Component-based UI framework with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing

### UI Libraries
- **Headless UI**: Unstyled, accessible UI components
- **Radix UI**: Low-level UI primitives
- **React Hook Form**: Performant forms with easy validation
- **Zod**: TypeScript-first schema validation

### Development Tools
- **Hot Module Replacement**: Fast development iteration
- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **PostCSS**: CSS processing

## 🌐 Port Configuration

### Development Server
- **Port**: 6600 (changed from 5173)
- **URL**: http://localhost:6600
- **Hot Reload**: Enabled for fast development

### Production
- **Port**: 6600 (Nginx served)
- **Static Files**: Built and served from `/dist`

## 🔧 Environment Configuration

### Environment Variables (.env)
```env
# Application
VITE_APP_NAME=Sales Forecast Console
VITE_FEATURE_UPLOAD=true
VITE_FEATURE_MANUAL_ENTRY=true
VITE_FEATURE_API_KEYS=true
VITE_FEATURE_LOGS=true

# Backend Service URLs
VITE_AUTH_URL=http://localhost:6601
VITE_DATA_URL=http://localhost:6603
VITE_DIM_URL=http://localhost:6604
VITE_INGEST_URL=http://localhost:6602

# API Configuration
VITE_DATA_API_KEY=sf_4e77abfe2e799431a21a9bf586f2a67fb518910e2f1b50c346b3b80fb9bdf5ca
```

### Docker Environment
When running in Docker, environment variables are injected:
```yaml
environment:
  - VITE_AUTH_URL=http://auth-service:6601
  - VITE_DATA_URL=http://data-service:6603
  - VITE_DIM_URL=http://dim-service:6604
  - VITE_INGEST_URL=http://ingest-service:6602
```

## 🎨 Design System

### Design Tokens (Tailwind CSS)
- **Colors**: 
  - Primary: Indigo (professional, trustworthy)
  - Accent: Emerald (success, growth)
  - Base: Neutral/Stone (clean, minimal)
  - Log Levels: Red (error), Yellow (warn), Blue (info), Gray (debug)
- **Spacing**: Tailwind defaults with consistent `space-y-*` for rhythm
- **Typography**: 
  - Font: Inter/Prompt for readability
  - Body: 14-16px
  - Headings: 20-24px
- **Elevation**: Subtle shadows (`shadow-sm`/`shadow`) for premium feel
- **Border Radius**: Consistent rounded corners for modern look

### Component Styling
- **Premium Feel**: Careful spacing, shadows, rounded corners
- **Focus States**: Accessible focus indicators
- **Hover Effects**: Subtle interactions for better UX
- **Loading States**: Skeleton loaders and spinners

## 📁 Project Structure

### Current Structure
```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── EditableGrid.tsx
│   │   ├── FileUpload.tsx
│   │   └── ManualEntryForm.tsx
│   ├── contexts/            # React contexts
│   │   └── ThemeContext.tsx
│   ├── hooks/               # Custom React hooks
│   │   └── useAuth.ts
│   ├── pages/               # Page components
│   │   ├── AdminImportPage.tsx
│   │   ├── ApiKeysPage.tsx
│   │   ├── ApiPortalPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── LogsPage.tsx      # Real-time logging
│   │   ├── ManualEntryPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── TextInputPage.tsx
│   ├── services/            # API client
│   │   └── api.ts
│   ├── ui/                  # Layout components
│   │   └── AppLayout.tsx
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles
├── public/
│   └── templates/          # Excel templates
│       └── dim-service-template.xlsx
├── Dockerfile             # Docker configuration
├── nginx.conf            # Nginx configuration
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

## 📄 Pages & Features

### Core Pages
1. **HomePage**: Dashboard and navigation
2. **LoginPage/SignupPage**: User authentication
3. **ProfilePage**: User profile management
4. **SettingsPage**: Application settings

### Business Pages
1. **AdminImportPage**: File upload and data import
2. **ManualEntryPage**: Manual data entry forms
3. **ApiKeysPage**: API key management
4. **ApiPortalPage**: API documentation and testing

### Monitoring Pages
1. **LogsPage**: Real-time log viewing and management
   - Live log streaming with auto-refresh
   - Filtering by service, level, time range
   - Color-coded log levels
   - Expandable log details
   - Clear logs functionality

### Utility Pages
1. **TextInputPage**: Text input and processing

## 🧩 Components

### Core Components
- **EditableGrid**: Data table with inline editing
- **FileUpload**: Drag-and-drop file upload with validation
- **ManualEntryForm**: Form for manual data entry
- **AppLayout**: Main application layout with navigation

### Future Components (Recommended)
- **DimSelect**: Generic select for dimensions (Company, Dept, DC, Sales Org, Material, SKU)
- **MonthPicker**: Date/month selection component
- **DataTable**: Advanced data table with sorting/filtering
- **Chart**: Data visualization components
- **LogViewer**: Real-time log display component

## 🔌 API Integration

### API Client (`services/api.ts`)
```typescript
// Centralized API client with authentication
const AUTH_BASE = import.meta.env.VITE_AUTH_URL || 'http://localhost:6601';
const DATA_BASE = import.meta.env.VITE_DATA_URL || 'http://localhost:6603';
const DIM_BASE = import.meta.env.VITE_DIM_URL || 'http://localhost:6604';
const INGEST_BASE = import.meta.env.VITE_INGEST_URL || 'http://localhost:6602';

// Authentication methods
// Bearer Token for user authentication
// X-API-Key for service authentication
```

### API Usage Patterns
- **User Authentication**: Bearer Token (`Authorization: Bearer <token>`)
- **Service Authentication**: API Key (`X-API-Key: <api-key>`)
- **Error Handling**: Consistent error handling across all API calls
- **Loading States**: Proper loading indicators for async operations

### Logging Integration
```typescript
// Logs API endpoints
export const logsApi = {
  getLogs: (params) => fetch(`${DATA_BASE}/v1/logs?${new URLSearchParams(params)}`, {
    headers: { 'X-API-Key': DATA_API_KEY }
  }),
  getStats: () => fetch(`${DATA_BASE}/v1/logs/stats`, {
    headers: { 'X-API-Key': DATA_API_KEY }
  }),
  clearLogs: () => fetch(`${DATA_BASE}/v1/logs`, {
    method: 'DELETE',
    headers: { 'X-API-Key': DATA_API_KEY }
  })
};
```

## 🎯 User Experience Guidelines

### Design Principles
- **Premium Feel**: Professional, clean, modern interface
- **Accessibility**: WCAG compliant with proper focus states
- **Responsive**: Works on desktop, tablet, and mobile
- **Performance**: Fast loading and smooth interactions

### Form Design
- **Auto-calculation**: Helper functions for `n±k` calculations from Anchor Month
- **Validation**: Real-time validation with helpful error messages
- **Progressive Enhancement**: Forms work without JavaScript

### Data Display
- **Lazy Loading**: For large datasets with typeahead search
- **Error Handling**: Per-row error display for file uploads
- **Loading States**: Clear feedback during async operations

### Logging UX
- **Real-time Updates**: Auto-refresh every 5 seconds
- **Color Coding**: 
  - 🔴 Error: Critical errors
  - 🟡 Warning: Warning messages
  - 🔵 Info: Informational messages
  - ⚪ Debug: Debug messages
- **Filtering**: Easy filtering by service, level, time range
- **Expandable Details**: Click to expand log data

## 🚀 Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Server runs on http://localhost:6600
```

### Docker Development
```bash
# Build and run with Docker Compose
docker-compose up -d frontend

# Or build individually
docker build -t demand-forecasting-frontend -f frontend/Dockerfile frontend
```

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration Files

### Vite Configuration (`vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 6600,
    host: true
  }
});
```

### Tailwind Configuration (`tailwind.config.ts`)
```typescript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom theme extensions
    },
  },
  plugins: [],
}
```

### TypeScript Configuration (`tsconfig.json`)
- Strict type checking enabled
- Path mapping for clean imports
- React JSX support

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Considerations
- Touch-friendly interface
- Optimized forms for mobile input
- Responsive navigation
- Mobile-optimized log viewer

## 🔐 Security Considerations

### Authentication
- Secure token storage
- Automatic token refresh
- Logout on token expiration

### API Security
- API keys stored securely
- CORS configuration
- Input validation and sanitization

### Content Security
- XSS protection
- Secure file upload handling
- Input validation on all forms

## 🚀 Future Enhancements

### Planned Features
- [ ] Advanced data visualization with charts
- [ ] Real-time notifications
- [ ] Dark mode theme
- [ ] Advanced filtering and search
- [ ] Export functionality
- [ ] Offline support
- [ ] Progressive Web App (PWA)

### Performance Optimizations
- [ ] Code splitting and lazy loading
- [ ] Image optimization
- [ ] Bundle size optimization
- [ ] Caching strategies
- [ ] Service worker implementation