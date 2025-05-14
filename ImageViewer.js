/**
 * ImageViewer - A plain vanilla web component for viewing, zooming, and panning images
 * 
 * Features:
 * - Zoom in/out with buttons or shift+mousewheel
 * - Pan with mouse drag (slippy-map style)
 * - Preset zoom levels (Actual Size, Fit Image, Fit Width, 50%, 75%, 100%, 125%)
 * - Images stay constrained within bounds
 */
class ImageViewer extends HTMLElement {
  constructor() {
    super();
    
    // Component state
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.lastTranslateX = 0;
    this.lastTranslateY = 0;
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.containerWidth = 0;
    this.containerHeight = 0;
    
    // No need to bind methods when using arrow functions
  }

  // Lifecycle methods
  connectedCallback() {
    // Create the DOM structure
    this.render();
    
    // Add event listeners
    this.addEventListeners();
    
    // Set initial image if src attribute exists
    if (this.hasAttribute('src')) {
      this.setImage(this.getAttribute('src'));
    }
    
    // Update container dimensions
    this.updateContainerDimensions();
    
    // Add resize observer to handle window resizing
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this);
  }
  
  disconnectedCallback() {
    // Clean up event listeners and observers
    this.removeEventListeners();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
  
  // Attribute changed callback for watching attributes
  static get observedAttributes() {
    return ['src'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'src' && oldValue !== newValue) {
      this.setImage(newValue);
    }
  }
  
  // Public API - getters and setters
  get src() {
    return this.getAttribute('src');
  }
  
  set src(value) {
    this.setAttribute('src', value);
  }
  
  // Component methods
  render = () => {
    // Create the DOM structure
    this.innerHTML = `
      <header>
        <div class="zoom-controls">
          <div class="zoom-buttons">
            <button title="Zoom out" class="zoom-out">-</button>
            <span class="zoom-level">100%</span>
            <button title="Zoom in" class="zoom-in">+</button>
          </div>
          <div class="zoom-dropdown">
            <button class="zoom-dropdown-button">
              <span class="caret">▼</span>
              <span class="selected-option">Fit Image</span>
            </button>
            <div class="zoom-dropdown-content">
              <button data-zoom="actual">Actual Size</button>
              <button data-zoom="fit">Fit Image</button>
              <button data-zoom="width">Fit Width</button>
              <button data-zoom="0.5">50%</button>
              <button data-zoom="0.75">75%</button>
              <button data-zoom="1">100%</button>
              <button data-zoom="1.25">125%</button>
            </div>
          </div>
        </div>
      </header>
      <figure>
        <img alt="Image preview" />
      </figure>
    `;
    
    // Cache DOM elements
    this.img = this.querySelector('img');
    this.zoomInBtn = this.querySelector('.zoom-in');
    this.zoomOutBtn = this.querySelector('.zoom-out');
    this.zoomLevelDisplay = this.querySelector('.zoom-level');
    this.dropdownButton = this.querySelector('.zoom-dropdown-button');
    this.dropdownContent = this.querySelector('.zoom-dropdown-content');
    this.selectedOptionDisplay = this.querySelector('.selected-option');
    this.figure = this.querySelector('figure');
    this.zoomOptions = this.querySelectorAll('.zoom-dropdown-content button');
  }
  
  addEventListeners = () => {
    // Store event handler references for later removal
    this.zoomInHandler = () => this.zoomIn();
    this.zoomOutHandler = () => this.zoomOut();
    this.toggleDropdownHandler = () => this.toggleDropdown();
    this.selectZoomOptionHandler = (e) => this.selectZoomOption(e);
    this.wheelHandler = (e) => this.handleWheel(e);
    this.mouseDownHandler = (e) => this.handleMouseDown(e);
    this.mouseMoveHandler = (e) => this.handleMouseMove(e);
    this.mouseUpHandler = () => this.handleMouseUp();
    
    // Zoom controls
    this.zoomInBtn.addEventListener('click', this.zoomInHandler);
    this.zoomOutBtn.addEventListener('click', this.zoomOutHandler);
    
    // Dropdown
    this.dropdownButton.addEventListener('click', this.toggleDropdownHandler);
    this.zoomOptions.forEach(option => {
      option.addEventListener('click', this.selectZoomOptionHandler);
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', e => {
      if (!this.dropdownButton.contains(e.target) && this.dropdownContent.classList.contains('show')) {
        this.dropdownContent.classList.remove('show');
      }
    });
    
    // Mouse wheel zooming (with shift key)
    this.addEventListener('wheel', this.wheelHandler, { passive: false });
    
    // Panning
    this.img.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    
    // Handle image load
    this.img.addEventListener('load', () => {
      this.naturalWidth = this.img.naturalWidth;
      this.naturalHeight = this.img.naturalHeight;
      this.resetZoom();
    });
  }
  
  removeEventListeners = () => {
    this.zoomInBtn.removeEventListener('click', this.zoomInHandler);
    this.zoomOutBtn.removeEventListener('click', this.zoomOutHandler);
    this.dropdownButton.removeEventListener('click', this.toggleDropdownHandler);
    this.zoomOptions.forEach(option => {
      option.removeEventListener('click', this.selectZoomOptionHandler);
    });
    this.removeEventListener('wheel', this.wheelHandler);
    this.img.removeEventListener('mousedown', this.mouseDownHandler);
    window.removeEventListener('mousemove', this.mouseMoveHandler);
    window.removeEventListener('mouseup', this.mouseUpHandler);
  }
  
  setImage = (src) => {
    if (this.img) {
      this.img.src = src;
    }
  }
  
  handleWheel = (e) => {
    // Only zoom if shift key is pressed
    if (e.shiftKey) {
      e.preventDefault();
      
      // Get precise mouse position relative to the figure element
      const rect = this.figure.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate zoom factor based on delta
      // Using smaller increments for smoother zooming
      const delta = e.deltaY;
      const zoomFactor = delta < 0 ? 1.1 : 0.9;
      
      // Apply zoom centered on mouse position
      this.zoomToPoint(mouseX, mouseY, zoomFactor);
    }
  }
  
  handleMouseDown = (e) => {
    // Start dragging
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.lastTranslateX = this.translateX;
    this.lastTranslateY = this.translateY;
    
    // Change cursor
    this.img.classList.add('grabbing');
    
    // Prevent default behavior
    e.preventDefault();
  }
  
  handleMouseMove = (e) => {
    if (!this.isDragging) return;
    
    // Calculate new position
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    
    this.translateX = this.lastTranslateX + dx;
    this.translateY = this.lastTranslateY + dy;
    
    // Apply the transform
    this.updateTransform();
    
    // Prevent default behavior
    e.preventDefault();
  }
  
  handleMouseUp = () => {
    // Stop dragging
    this.isDragging = false;
    
    // Restore cursor
    this.img.classList.remove('grabbing');
    
    // Ensure image stays within bounds
    this.constrainToBounds();
  }
  
  handleResize = () => {
    // Update container dimensions
    this.updateContainerDimensions();
    
    // Reset zoom to maintain proper constraints
    this.resetZoom();
  }
  
  updateContainerDimensions = () => {
    this.containerWidth = this.figure.clientWidth;
    this.containerHeight = this.figure.clientHeight;
  }
  
  zoomIn = (e) => {
    if (e instanceof MouseEvent) {
      // Get mouse position relative to container for zoom origin
      const rect = this.figure.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.zoomToPoint(mouseX, mouseY, 1.1);
    } else {
      // Default to center zoom if no mouse event
      const centerX = this.containerWidth / 2;
      const centerY = this.containerHeight / 2;
      this.zoomToPoint(centerX, centerY, 1.1);
    }
  }
  
  zoomOut = (e) => {
    if (e instanceof MouseEvent) {
      // Get mouse position relative to container for zoom origin
      const rect = this.figure.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.zoomToPoint(mouseX, mouseY, 0.9);
    } else {
      // Default to center zoom if no mouse event
      const centerX = this.containerWidth / 2;
      const centerY = this.containerHeight / 2;
      this.zoomToPoint(centerX, centerY, 0.9);
    }
  }
  
  zoomToPoint = (pointX, pointY, factor) => {
    // Calculate new scale with limits
    const prevScale = this.scale;
    const newScale = factor > 1 
      ? Math.min(prevScale * factor, 5)  // Zoom in (limit to 5x)
      : Math.max(prevScale * factor, 0.1); // Zoom out (limit to 0.1x)
      
    // Get the mouse position relative to the image in its current state
    // This is the key to proper zooming behavior
    const mouseXOnImage = (pointX - this.translateX) / prevScale;
    const mouseYOnImage = (pointY - this.translateY) / prevScale;
    
    // Set the new scale
    this.scale = newScale;
    
    // Calculate the new position to keep the mouse point fixed
    this.translateX = pointX - mouseXOnImage * newScale;
    this.translateY = pointY - mouseYOnImage * newScale;
    
    // Update the transform and zoom display
    this.updateTransform();
    this.updateZoomLevelDisplay();
    
    // Apply constraints to keep image partially visible
    this.constrainToBounds();
  }
  
  toggleDropdown = () => {
    this.dropdownContent.classList.toggle('show');
  }
  
  selectZoomOption = (e) => {
    // Get the selected zoom option
    const option = e.currentTarget;
    const zoomValue = option.getAttribute('data-zoom');
    
    // Update selected option display
    this.selectedOptionDisplay.textContent = option.textContent;
    
    // Apply the selected zoom
    this.applyZoomOption(zoomValue);
    
    // Hide dropdown
    this.dropdownContent.classList.remove('show');
  }
  
  applyZoomOption = (zoomValue) => {
    // Calculate center point for zooming
    const centerX = this.containerWidth / 2;
    const centerY = this.containerHeight / 2;
    
    // Store previous scale for proper transition
    const prevScale = this.scale;
    
    // Apply appropriate zoom based on option
    switch (zoomValue) {
      case 'actual':
        // Set to actual size (1:1 pixel ratio)
        this.scale = 1;
        break;
      case 'fit':
        // Fit entire image in view
        this.fitImage();
        break;
      case 'width':
        // Fit image width to container
        this.fitWidth();
        break;
      default:
        // Apply percentage zoom
        this.scale = parseFloat(zoomValue);
    }
    
    // For preset zoom levels, center the image
    this.translateX = centerX - (this.naturalWidth * this.scale) / 2;
    this.translateY = centerY - (this.naturalHeight * this.scale) / 2;
    
    // Update transform and display
    this.updateTransform();
    this.updateZoomLevelDisplay();
    
    // Ensure image stays within bounds
    this.constrainToBounds();
  }
  
  fitImage = () => {
    // Calculate scale to fit the entire image within the container
    const scaleX = this.containerWidth / this.naturalWidth;
    const scaleY = this.containerHeight / this.naturalHeight;
    this.scale = Math.min(scaleX, scaleY);
  }
  
  fitWidth = () => {
    // Calculate scale to fit the image width to the container width
    this.scale = this.containerWidth / this.naturalWidth;
  }
  
  resetZoom = () => {
    // Default to "Fit Image" when image loads or container resizes
    this.applyZoomOption('fit');
    this.selectedOptionDisplay.textContent = 'Fit Image';
  }
  
  updateTransform = () => {
    // Apply transform to the image
    this.img.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }
  
  updateZoomLevelDisplay = () => {
    // Update zoom level percentage display
    const percentage = Math.round(this.scale * 100);
    this.zoomLevelDisplay.textContent = `${percentage}%`;
  }
  
  constrainToBounds = () => {
    // Calculate scaled dimensions
    const scaledWidth = this.naturalWidth * this.scale;
    const scaledHeight = this.naturalHeight * this.scale;
    
    // New constraint: ensure image isn't ENTIRELY outside the viewport
    // This means at least some part of the image must be visible
    
    // For horizontal constraint:
    if (scaledWidth <= this.containerWidth) {
      // If image is narrower than container, center it
      this.translateX = (this.containerWidth - scaledWidth) / 2;
    } else {
      // If image is wider than container, constrain it to have some part visible
      const minX = this.containerWidth - scaledWidth; // Right edge at left of viewport
      const maxX = 0; // Left edge at left of viewport
      
      // Allow the image to go partially outside the viewport but not completely
      this.translateX = Math.min(Math.max(this.translateX, minX), maxX);
    }
    
    // For vertical constraint:
    if (scaledHeight <= this.containerHeight) {
      // If image is shorter than container, center it
      this.translateY = (this.containerHeight - scaledHeight) / 2;
    } else {
      // If image is taller than container, constrain it to have some part visible
      const minY = this.containerHeight - scaledHeight; // Bottom edge at top of viewport
      const maxY = 0; // Top edge at top of viewport
      
      // Allow the image to go partially outside the viewport but not completely
      this.translateY = Math.min(Math.max(this.translateY, minY), maxY);
    }
    
    // Apply constrained transform
    this.updateTransform();
  }
}

// Register the custom element
customElements.define('image-viewer', ImageViewer);