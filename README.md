---
title: Image Viewer Web Component
description: A plain vanilla JavaScript web component for viewing, zooming, and panning images without using Shadow DOM.
author: Patrick Hall
---

A plain vanilla JavaScript web component for viewing, zooming, and panning
images.

## Features

- Zoom in/out with buttons or shift+mousewheel
- Pan with mouse drag (slippy-map style)
- Dropdown menu with preset zoom levels
- Image constrained within container bounds
- Responsive design

## Usage

### Basic Implementation

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="image-viewer.css">
    <script type="module" src="ImageViewer.js"></script>
  </head>
  <body>
    <image-viewer src="path/to/image.jpg"></image-viewer>
  </body>
</html>
```

### HTML Structure

The component creates the following DOM structure:

```
image-viewer
  ├── header
  │   └── zoom controls (buttons and dropdown)
  └── figure
      └── img
```

### Attributes

- `src`: Path to the image (required)

### JavaScript API

You can dynamically change the image:

```javascript
const viewer = document.querySelector("image-viewer")
viewer.src = "path/to/new-image.jpg"
```

## Zoom Controls

- **Zoom Buttons**: Click the "+" and "-" buttons to zoom in and out
- **Mousewheel**: Hold Shift + use the mousewheel to zoom in and out
- **Dropdown Menu**: Select from preset zoom levels:
  - Actual Size: 1:1 pixel ratio
  - Fit Image: Fit entire image in container
  - Fit Width: Match image width to container width
  - Percentage options: 50%, 75%, 100%, 125%

## Panning

- Click and drag to pan the image (slippy-map style)
- Image will stay constrained within the container bounds

## Browser Support

This component works in all modern browsers that support Web Components:

- Chrome, Edge (Chromium-based)
- Firefox
- Safari

## Customization

You can customize the appearance by modifying the `image-viewer.css` file.

## License

MIT
