'use client'

import type { Product } from '@/payload-types'
import Link from 'next/link'
import React, { useTransition } from 'react'
import { Media } from '@/components/Media'
import { Price } from '@/components/Price'
import { Sparkles, ShoppingBag, Check, Loader2 } from 'lucide-react'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { toast } from 'sonner'

type Props = {
  product: Partial<Product>
  index: number
  isHero?: boolean
  layoutMode?: 'masonry' | 'uniform'
}

export type KraftiTileConfig = {
  colSpan: string
  rowSpan: string
  bgClass: string
  isDark: boolean
  isLarge?: boolean
  isWide?: boolean
}

// Patrón irregular de Masonry idéntico a Krafti (3 columnas)
// con paleta editorial: Lino crudo (#FAF8F5), Blanco nácar (#FFFFFF), Arena suave (#F5F2EC)
// y tile oscura nocturna con el color noble del footer (#3B032F)
export const KRAFTI_MASONRY_PATTERN: KraftiTileConfig[] = [
  // 0: Gran pieza protagonista 2 columnas x 2 filas (Arena suave pedestal)
  {
    colSpan: 'col-span-1 md:col-span-2',
    rowSpan: 'row-span-1 md:row-span-2',
    bgClass: 'bg-[#F5F2EC] dark:bg-zinc-900/80',
    isDark: false,
    isLarge: true,
  },
  // 1: Cuadrado 1x1 (Lino crudo)
  {
    colSpan: 'col-span-1 md:col-span-1',
    rowSpan: 'row-span-1 md:row-span-1',
    bgClass: 'bg-[#FAF8F5] dark:bg-zinc-900/40',
    isDark: false,
  },
  // 2: Cuadrado 1x1 (Blanco nácar luminoso)
  {
    colSpan: 'col-span-1 md:col-span-1',
    rowSpan: 'row-span-1 md:row-span-1',
    bgClass: 'bg-[#FFFFFF] dark:bg-zinc-900/20',
    isDark: false,
  },
  // 3: Cuadrado 1x1 (Blanco nácar luminoso)
  {
    colSpan: 'col-span-1 md:col-span-1',
    rowSpan: 'row-span-1 md:row-span-1',
    bgClass: 'bg-[#FFFFFF] dark:bg-zinc-900/20',
    isDark: false,
  },
  // 4: TILE OSCURA NOCTURNA (#3B032F) - Punto focal central
  {
    colSpan: 'col-span-1 md:col-span-1',
    rowSpan: 'row-span-1 md:row-span-1',
    bgClass: 'bg-[#3B032F]',
    isDark: true,
  },
  // 5: Cuadrado 1x1 (Lino crudo)
  {
    colSpan: 'col-span-1 md:col-span-1',
    rowSpan: 'row-span-1 md:row-span-1',
    bgClass: 'bg-[#FAF8F5] dark:bg-zinc-900/40',
    isDark: false,
  },
  // 6: Cuadrado 1x1 (Lino crudo)
  {
    colSpan: 'col-span-1 md:col-span-1',
    rowSpan: 'row-span-1 md:row-span-1',
    bgClass: 'bg-[#FAF8F5] dark:bg-zinc-900/40',
    isDark: false,
  },
  // 7: Cuadrado 1x1 (Blanco nácar luminoso)
  {
    colSpan: 'col-span-1 md:col-span-1',
    rowSpan: 'row-span-1 md:row-span-1',
    bgClass: 'bg-[#FFFFFF] dark:bg-zinc-900/20',
    isDark: false,
    isWide: false,
  },
]

const extractShortDescription = (desc: any, max = 80): string => {
  if (!desc) return ''
  if (typeof desc === 'string') {
    const clean = desc.replace(/<[^>]*>/g, '').trim()
    return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
  }
  if (typeof desc === 'object' && desc.root?.children) {
    try {
      const extractText = (node: any): string => {
        if (!node) return ''
        if (node.text) return node.text
        if (Array.isArray(node.children)) {
          return node.children.map(extractText).join(' ')
        }
        return ''
      }
      const text = extractText(desc.root).replace(/\s+/g, ' ').trim()
      return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
    } catch {
      return ''
    }
  }
  return ''
}

// Dos únicos colores de fondo para modo uniforme
const BG_CREMA_LINO = 'bg-[#FAF8F5] dark:bg-zinc-900/60'
const BG_BLANCO = 'bg-[#FFFFFF] dark:bg-zinc-900/20'

const getKraftiBg = (index: number): string => {
  const row = Math.floor(index / 4)
  const col = index % 4
  const isLino = (row + col) % 2 === 0
  return isLino ? BG_CREMA_LINO : BG_BLANCO
}

export const KraftiProductTile: React.FC<Props> = ({ product, index, layoutMode = 'masonry' }) => {
  const { addItem, isLoading } = useCart()
  const [isPending, startTransition] = useTransition()
  const [added, setAdded] = React.useState(false)

  const { gallery, priceInCOP, title, featured, inventory, description } = product

  let price = priceInCOP
  const variants = product.variants?.docs
  if (variants && variants.length > 0) {
    const variant = variants[0]
    if (
      variant &&
      typeof variant === 'object' &&
      variant?.priceInCOP &&
      typeof variant.priceInCOP === 'number'
    ) {
      price = variant.priceInCOP
    }
  }

  const image =
    gallery?.[0]?.image && typeof gallery[0]?.image !== 'string' ? gallery[0]?.image : false

  const productSlug = product.slug || String(product.id)

  const firstCategory = product.categories?.[0]
  const categoryTitle =
    firstCategory && typeof firstCategory === 'object' && 'title' in firstCategory
      ? firstCategory.title
      : null

  const isOutOfStock = typeof inventory === 'number' && inventory <= 0

  // Configuración de layout según el patrón irregular de Krafti o uniforme
  const isMasonry = layoutMode === 'masonry'
  const tilePattern = isMasonry
    ? KRAFTI_MASONRY_PATTERN[index % KRAFTI_MASONRY_PATTERN.length]
    : {
        colSpan: 'col-span-1',
        rowSpan: 'row-span-1',
        bgClass: getKraftiBg(index),
        isDark: false,
        isLarge: false,
        isWide: false,
      }

  const { colSpan, rowSpan, bgClass, isDark, isLarge, isWide } = tilePattern
  const shortDescription = extractShortDescription(description, isLarge ? 140 : 80)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isOutOfStock || !product.id) return

    startTransition(async () => {
      try {
        const variants = product.variants?.docs
        const firstVariant = variants && variants.length > 0 ? variants[0] : null
        const variantId = firstVariant && typeof firstVariant === 'object' ? firstVariant.id : undefined

        await addItem({
          product: product.id as number,
          ...(variantId ? { variant: variantId } : {}),
        })
        setAdded(true)
        toast.success(`¡${title} agregado al carrito!`)
        setTimeout(() => setAdded(false), 2000)
      } catch (err) {
        console.error('Error adding item:', err)
        toast.error('No se pudo agregar al carrito')
      }
    })
  }

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden border-r border-b ${
        isDark ? 'border-[#4D0A3F]/60' : 'border-border/40'
      } transition-[border-color,background-color] duration-300 ${bgClass} ${colSpan} ${rowSpan} h-full min-h-[380px]`}
    >
      {/* Badges superiores sutiles (Destacado / Agotado) + Botón móvil rápido */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between pointer-events-none">
        {featured ? (
          <span
            className={`inline-flex items-center gap-1 text-[9px] uppercase font-semibold tracking-widest px-2.5 py-0.5 rounded-full shadow-sm ${
              isDark ? 'bg-[#DFC188] text-[#3B032F]' : 'bg-brand text-white'
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            Destacado
          </span>
        ) : (
          <span />
        )}

        {isOutOfStock ? (
          <span className="bg-neutral-900/85 text-white text-[9px] uppercase font-medium tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">
            Agotado
          </span>
        ) : (
          <span />
        )}
      </div>

      {/* Contenedor de la Imagen: proporción adaptativa según tamaño del tile */}
      <div
        className={`relative w-full flex items-center justify-center p-5 sm:p-8 overflow-hidden ${
          isLarge
            ? 'flex-1 min-h-[360px] sm:min-h-[440px] md:min-h-[520px]'
            : isWide
            ? 'h-[260px] sm:h-[320px]'
            : 'h-[260px] sm:h-[300px]'
        }`}
      >
        <Link
          href={`/products/${productSlug}`}
          className="relative w-full h-full flex items-center justify-center z-10 focus:outline-none"
        >
          {image ? (
            <Media
              fill
              imgClassName={`object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-105 ${
                isDark
                  ? 'drop-shadow-[0_18px_38px_rgba(0,0,0,0.65)]'
                  : 'drop-shadow-[0_12px_28px_rgba(28,25,23,0.07)]'
              }`}
              resource={image}
              priority={index < 4}
            />
          ) : (
            <div
              className={`flex aspect-square w-24 items-center justify-center rounded-full text-3xl font-serif ${
                isDark
                  ? 'bg-white/10 text-white/40'
                  : 'bg-background/40 text-muted-foreground/30'
              }`}
            >
              ✦
            </div>
          )}
        </Link>
      </div>

      {/* Información del Producto Centrada al Pie estilo Krafti */}
      <Link
        href={`/products/${productSlug}`}
        className={`pb-6 sm:pb-7 px-4 sm:px-6 text-center flex flex-col items-center justify-center gap-1.5 z-10 focus:outline-none`}
      >
        <span
          className={`text-[10px] font-sans font-semibold tracking-[0.25em] uppercase ${
            isDark ? 'text-[#DFC188]' : 'text-[#8B5A2B] dark:text-[#E2AB80]'
          }`}
        >
          {categoryTitle || 'Joyería en Mostacilla'}
        </span>

        <h3
          className={`font-serif tracking-[0.05em] font-normal transition-colors duration-300 leading-snug line-clamp-1 ${
            isLarge
              ? 'text-lg sm:text-xl md:text-2xl'
              : 'text-sm sm:text-base'
          } ${
            isDark
              ? 'text-white group-hover:text-[#DFC188]'
              : 'text-[#1C1917] dark:text-neutral-100 group-hover:text-brand'
          }`}
        >
          {title}
        </h3>

        {shortDescription ? (
          <p
            className={`text-xs font-light line-clamp-2 max-w-[280px] mx-auto mt-0.5 leading-relaxed min-h-[32px] ${
              isDark ? 'text-purple-100/80' : 'text-neutral-600 dark:text-neutral-300'
            }`}
          >
            {shortDescription}
          </p>
        ) : (
          <div className="min-h-[32px]" />
        )}

        {typeof price === 'number' && (
          <span
            className={`font-serif font-semibold tracking-wider text-base sm:text-lg mt-1 ${
              isDark ? 'text-[#DFC188]' : 'text-brand dark:text-purple-300'
            }`}
          >
            <Price amount={price} currencyCode="COP" />
          </span>
        )}
      </Link>

      {/* Capa que sube desde abajo cubriendo TODO el tile (Mobile + Desktop) */}
      <div className="flex absolute inset-0 items-center justify-center bg-black/10 backdrop-blur-[1px] translate-y-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-active:translate-y-0 group-active:opacity-100 z-30 pointer-events-none group-hover:pointer-events-auto group-active:pointer-events-auto">
        {isOutOfStock ? (
          <button
            type="button"
            disabled
            className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-[11px] uppercase tracking-wider font-medium bg-neutral-900/90 text-white shadow-md border border-white/20 cursor-not-allowed flex items-center gap-1.5"
          >
            Agotado
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isLoading || isPending}
            className={`px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-[11px] uppercase tracking-wider font-medium shadow-md border active:scale-[0.96] transition-all duration-300 flex items-center gap-1.5 cursor-pointer pointer-events-auto ${
              isDark
                ? 'bg-brand hover:bg-brand-dark text-white border-transparent font-semibold shadow-lg'
                : 'bg-brand hover:bg-brand-dark text-white border-white/20'
            }`}
          >
            {isLoading || isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Agregando...
              </>
            ) : added ? (
              <>
                <Check className="w-3 h-3" />
                Agregado
              </>
            ) : (
              <>
                <ShoppingBag className="w-3 h-3" />
                Agregar al Carrito
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
