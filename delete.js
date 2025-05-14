class ImageMove {
  constructor(containerId, imageId) {
    this.container = document.getElementById(containerId)
    this.image = document.getElementById(imageId)

    if (!this.container || !this.image) {
      throw new Error('Container or image element not found')
    }

    this.dragging = false
    this.lastPosition = { x: 0, y: 0 }

    this.boundStart = this.onStart.bind(this)
    this.boundMove = this.onMove.bind(this)
    this.boundEnd = this.onEnd.bind(this)
  }

  addEvents() {
    this.container.addEventListener('mousedown', this.boundStart)
    this.container.addEventListener('touchstart', this.boundStart, { passive: false })

    window.addEventListener('mousemove', this.boundMove)
    window.addEventListener('touchmove', this.boundMove, { passive: false })

    window.addEventListener('mouseup', this.boundEnd)
    window.addEventListener('touchend', this.boundEnd)
  }

  removeEvents() {
    this.container.removeEventListener('mousedown', this.boundStart)
    this.container.removeEventListener('touchstart', this.boundStart)

    window.removeEventListener('mousemove', this.boundMove)
    window.removeEventListener('touchmove', this.boundMove)

    window.removeEventListener('mouseup', this.boundEnd)
    window.removeEventListener('touchend', this.boundEnd)
  }

  getPosition(event) {
    if (event.touches) {
      return {
        x: event.touches[0].pageX,
        y: event.touches[0].pageY
      }
    }
    return {
      x: event.clientX,
      y: event.clientY
    }
  }

  onStart(event) {
    event.preventDefault()
    const pos = this.getPosition(event)
    const rect = this.container.getBoundingClientRect()
    this.lastPosition = {
      x: pos.x - rect.left,
      y: pos.y - rect.top
    }
    this.dragging = true
  }

  onMove(event) {
    if (!this.dragging) return

    event.preventDefault()
    const pos = this.getPosition(event)
    const rect = this.container.getBoundingClientRect()

    const current = {
      x: pos.x - rect.left,
      y: pos.y - rect.top
    }

    const deltaX = current.x - this.lastPosition.x
    const deltaY = current.y - this.lastPosition.y

    this.lastPosition = current

    const imgStyle = window.getComputedStyle(this.image)
    const top = parseInt(imgStyle.top || '0', 10)
    const left = parseInt(imgStyle.left || '0', 10)

    const containerRect = this.container.getBoundingClientRect()
    const imageRect = this.image.getBoundingClientRect()

    let newTop = top + deltaY
    let newLeft = left + deltaX

    const maxTop = 0
    const minTop = containerRect.height - imageRect.height
    const maxLeft = 0
    const minLeft = containerRect.width - imageRect.width

    newTop = Math.min(maxTop, Math.max(minTop, newTop))
    newLeft = Math.min(maxLeft, Math.max(minLeft, newLeft))

    Object.assign(this.image.style, {
      top: `${newTop}px`,
      left: `${newLeft}px`
    })
  }

  onEnd(event) {
    event.preventDefault()
    this.dragging = false
  }
}
