export interface Category {
  id: number
  name: string
  slug: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  children?: { id: number; name: string; slug: string | null }[]
}

export interface ModelCard {
  id: number
  name: string
  slug: string | null
  imagePath: string
}

export interface Part {
  id: number
  number: number
  partNumber: string
  name: string | null
  price: number
  availability: boolean
  quantity: number
  slug: string | null
  xCoord: number | null
  yCoord: number | null
  width: number | null
  height: number | null
}

export interface Slide {
  id: number
  slideNumber: number
  imagePath: string
  imageWidth: number | null
  imageHeight: number | null
  hasSvg: boolean
  parts: Part[]
}

export interface ModelDetail {
  id: number
  name: string
  slug: string | null
  imagePath: string
  seoTitle: string | null
  seoDescription: string | null
  h1: string | null
  content: string | null
  isIndexable: boolean
  category: { id: number; name: string; slug: string | null }
  slides: Slide[]
}
