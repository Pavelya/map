# MapLibre Quick Start Guide

## 🚀 Get Started in 2 Steps (No API Key Needed!)

### 1. Start the Dev Server

```bash
pnpm dev
```

### 2. View the Demo

Open: http://localhost:3000/map-demo

**That's it!** The map works out of the box with free OpenStreetMap tiles. No API key required!

## ✨ Why MapLibre?

- ✅ **100% FREE** - No usage limits, no API key required
- ✅ **Open Source** - Community-driven, no vendor lock-in
- ✅ **Fast** - WebGL-based, same performance as Mapbox
- ✅ **No signup** - Works immediately with OSM tiles

## 📦 What's Included

| Component/File | Purpose |
|----------------|---------|
| `MapContainer` | Main map component with loading/error states |
| `MapboxMap` | Core MapLibre GL JS initialization |
| `useMap()` | Hook to access map instance |
| `useMapEvent()` | Subscribe to map events |
| `map-config.ts` | Configuration (free OSM tiles by default) |
| `map-utils.ts` | Helper functions (fly to, fit bounds, etc.) |

## 💡 Basic Usage

```tsx
import { MapContainer } from '@/components/Map';

export default function MyPage() {
  return (
    <div className="h-screen">
      <MapContainer />
    </div>
  );
}
```

## 🎨 Optional: Better Styling with Maptiler

Want professional map styles? Sign up for **free Maptiler** (100k tiles/month):

1. Sign up: https://www.maptiler.com/
2. Get your API key
3. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_MAPTILER_KEY=your-api-key
   ```
4. Restart dev server

The map will automatically use Maptiler's beautiful styles!

## 🎯 Common Tasks

### Fly to Location

```tsx
import { flyToLocation } from '@/lib/map-utils';

flyToLocation(map, -74.006, 40.7128, 10); // NYC
```

### Watch Zoom Changes

```tsx
import { useMapZoom } from '@/hooks/useMap';

useMapZoom((zoom) => {
  console.log('New zoom:', zoom);
});
```

### Convert H3 to Coordinates

```tsx
import { convertToMapboxCoordinates } from '@/lib/map-utils';

const [lng, lat] = convertToMapboxCoordinates('8a2a1072b59ffff');
```

## 🗺️ Map Tile Options

### Option 1: OpenStreetMap (Default)
- **Cost**: Free
- **Setup**: None needed!
- **Limits**: None
- **Quality**: Good (basic styling)

### Option 2: Maptiler Free Tier
- **Cost**: Free up to 100k tiles/month
- **Setup**: Add API key to .env.local
- **Limits**: 100k tile loads/month
- **Quality**: Excellent (professional styling)

## 📚 Full Documentation

- [Migration Guide](MAPLIBRE-MIGRATION.md) - Why we switched from Mapbox
- [Component README](src/components/Map/README.md) - All hooks and components
- [Task Summary](TASK-10-SUMMARY.md) - Complete implementation details

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Map not loading | Check browser console - should work with no setup |
| Want better styling | Add Maptiler API key to `.env.local` |
| TypeScript errors | Run `pnpm type-check` |

## 💰 Cost Comparison

For 10,000 monthly active users:

| Provider | Monthly Cost |
|----------|--------------|
| **MapLibre + OSM** | **$0** ✅ |
| MapLibre + Maptiler | $0 (free tier) |
| Mapbox | $500+ ❌ |

## 📞 Support

- MapLibre Docs: https://maplibre.org/maplibre-gl-js-docs/
- Maptiler Free Signup: https://www.maptiler.com/
- Demo Page: http://localhost:3000/map-demo

---

✅ **Status**: Ready to use - no configuration required!
📦 **Package**: MapLibre GL JS v5.10.0
🆓 **Cost**: Free forever
🔧 **Framework**: Next.js 14 + React + TypeScript
