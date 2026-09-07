'use client'

import type { Media } from '@/payload-types'
import React, { useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

export type Slide = {
  modelImage?: number | Media | null
  image?: number | Media
  imagePosition?: 'top' | 'center' | 'bottom' | null
  badge?: string | null
  heading?: string
  metaText?: string | null
  subheading?: string | null
  tabTitle?: string | null
  linkLabel?: string | null
  linkUrl?: string | null
}

export const SliderHeroClient: React.FC<{
  modelImage?: number | Media | null
  badge?: string | null
  heading?: string | null
  headingHighlight?: string | null
  linkLabel?: string | null
  linkUrl?: string | null
  socialLinks?: {
    instagramUrl?: string | null
    whatsappUrl?: string | null
    telegramUrl?: string | null
    facebookUrl?: string | null
  } | null
  slides?: Slide[]
  fallbackRichText?: any
  fallbackLinks?: any
  authorMedia?: number | Media | null
}> = ({
  modelImage,
  badge,
  heading,
  headingHighlight,
  linkLabel,
  linkUrl,
  socialLinks,
  slides,
}) => {
  const containerRef = useRef<HTMLElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const imageSrc =
    typeof modelImage === 'object' && modelImage && 'url' in modelImage && modelImage.url
      ? (modelImage.url as string)
      : '/shirley-hdr-sin-fondo.svg?v=2'

  const imageAlt =
    typeof modelImage === 'object' && modelImage && 'alt' in modelImage && modelImage.alt
      ? (modelImage.alt as string)
      : 'Shirley luciendo joyería artesanal de autor en micro-mostacilla Nénufar'

  const rawBadge = badge || slides?.[0]?.badge || null
  const badgeText =
    rawBadge && !rawBadge.toUpperCase().includes('ALTA JOYER') ? rawBadge : null
  const mainHeading = heading || 'La nobleza del Caribe no se hereda.'
  const highlightText =
    headingHighlight !== undefined && headingHighlight !== null ? headingHighlight : 'Se teje.'
  const ctaLabel = linkLabel || 'Conoce la colección'
  const ctaUrl = linkUrl || '/shop'

  const instagram = socialLinks?.instagramUrl ?? 'https://www.instagram.com/nenufar.co/'
  const facebook = socialLinks?.facebookUrl ?? 'https://www.facebook.com/nenufar.co'
  const whatsapp =
    socialLinks?.whatsappUrl ??
    'https://wa.me/?text=Hola%2C%20quisiera%20consultar%20sobre%20las%20joyas%20artesanales%20de%20N%C3%A9nufar'
  const telegram = socialLinks?.telegramUrl ?? 'https://t.me/'
  const hasSocial = Boolean(instagram || facebook || whatsapp || telegram)

  useGSAP(
    () => {
      const textElements = [
        badgeRef.current,
        headingRef.current,
        actionsRef.current,
      ].filter(Boolean)

      // Respeto estricto a accesibilidad y reducción de movimiento (WCAG 2.3.3)
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (imgRef.current) {
          gsap.set(imgRef.current, { opacity: 1, y: -27, scale: 1.28, x: 30, transformOrigin: '51.8% 38%' })
        }
        if (textElements.length > 0) {
          gsap.set(textElements, { opacity: 1, y: 0 })
        }
        return
      }

      const mm = gsap.matchMedia(containerRef)

      // Desktop & Tablet landscape (>= 1024px)
      mm.add('(min-width: 1024px)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

        // 1. Imagen desciende suavemente
        if (imgRef.current) {
          tl.fromTo(
            imgRef.current,
            { y: -35, opacity: 0.85, scale: 1, x: 0 },
            { y: 0, opacity: 1, duration: 0.9, ease: 'power2.out' },
            0.05,
          )

          // 2. Zoom cinematográfico que mantiene la palenquera completa y el turbante 100% intacto
          tl.to(
            imgRef.current,
            {
              scale: 1.28,
              transformOrigin: '51.8% 38%',
              x: 30,
              y: -27,
              duration: 1.8,
              ease: 'power2.inOut',
            },
            '+=0.05',
          )
        }

        // 3. Texto entra elegante desde abajo
        if (textElements.length > 0) {
          tl.fromTo(
            textElements,
            {
              y: 45,
              opacity: 0,
            },
            {
              y: 0,
              opacity: 1,
              duration: 0.85,
              stagger: 0.08,
              ease: 'power3.out',
              clearProps: 'transform,opacity',
            },
            0.25,
          )
        }
      })

      // Tablet portrait (768px - 1023px)
      mm.add('(min-width: 768px) and (max-width: 1023px)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

        if (textElements.length > 0) {
          tl.fromTo(
            textElements,
            {
              y: 35,
              opacity: 0,
            },
            {
              y: 0,
              opacity: 1,
              duration: 0.75,
              stagger: 0.07,
              ease: 'power3.out',
              clearProps: 'transform,opacity',
            },
            0.1,
          )
        }

        if (imgRef.current) {
          tl.fromTo(
            imgRef.current,
            { y: -20, opacity: 0.85, scale: 1 },
            { y: 0, opacity: 1, duration: 0.75, ease: 'power2.out' },
            0.05,
          )

          tl.to(
            imgRef.current,
            {
              scale: 1.2,
              transformOrigin: '51.8% 25%',
              y: -28,
              duration: 1.5,
              ease: 'power2.inOut',
            },
            '+=0.05',
          )
        }
      })

      // Mobile (< 768px) - Impeccable Motion Design
      mm.add('(max-width: 767px)', () => {
        // Respeto riguroso a preferencias de accesibilidad (prefers-reduced-motion)
        const prefersReducedMotion =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches

        if (prefersReducedMotion) {
          if (imgRef.current) {
            gsap.set(imgRef.current, {
              opacity: 1,
              scale: 0.88,
              y: 0,
              transformOrigin: '51.8% 28%',
            })
          }
          if (textElements.length > 0) {
            gsap.set(textElements, { opacity: 1, y: 0 })
          }
          return
        }

        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })

        // 1. Fotografía de autor: Llega sutilmente desde abajo (from below)
        //    Escala más contenida (0.95) y natural para que no se sienta invasiva ni grande
        if (imgRef.current) {
          const targetY = 0
          const breathTargetY = -5
          const startY = 36 // Entrada suave y sutil desde abajo

          gsap.set(imgRef.current, {
            scale: 0.88,
            transformOrigin: '51.8% 25%',
            willChange: 'transform, opacity',
          })

          tl.fromTo(
            imgRef.current,
            {
              y: startY,
              opacity: 0,
            },
            {
              y: targetY,
              opacity: 1,
              duration: 1.2,
              ease: 'power2.out',
              onComplete: () => {
                // Sutil respiro ambiental (ambient breath): suave y sereno
                gsap.to(imgRef.current, {
                  y: breathTargetY,
                  duration: 3.6,
                  ease: 'sine.inOut',
                  yoyo: true,
                  repeat: -1,
                })
              },
            },
            0.05,
          )
        }

        // 2. Coreografía tipográfica: Llega sutilmente desde arriba (from above)
        //    Badge -> Titular H1 -> CTA y Redes descendiendo suavemente
        if (badgeRef.current) {
          tl.fromTo(
            badgeRef.current,
            { y: -18, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.65, ease: 'power2.out' },
            0.12,
          )
        }

        if (headingRef.current) {
          tl.fromTo(
            headingRef.current,
            { y: -26, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.85,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
            },
            0.24,
          )
        }

        if (actionsRef.current) {
          tl.fromTo(
            actionsRef.current,
            { y: -20, opacity: 0, scale: 0.98 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 0.75,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
            },
            0.38,
          )
        }
      })

      return () => mm.revert()
    },
    { scope: containerRef },
  )

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-screen min-h-[100dvh] -mt-[74px] sm:-mt-[78px] pt-[78px] sm:pt-[88px] lg:pt-[105px] pb-0 bg-[#DBC4AC] border-b border-[#C8AF95]/60 flex flex-col justify-between overflow-hidden select-none transition-colors duration-500"
    >
      <div className="relative z-20 max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 w-full pt-[clamp(3.5rem,calc(52vh-309px),14rem)] sm:pt-6 md:pt-8 lg:pt-8 pb-4 sm:pb-8 lg:my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start lg:items-center">
          
          {/* ========================================================= */}
          {/* COLUMNA IZQUIERDA: Titular, Badge, CTA & Redes            */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 flex flex-col items-start text-left max-w-2xl py-0">
            {/* Badge superior */}
            {badgeText && (
              <div
                ref={badgeRef}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-[#F4ECE3] border border-[#C8AF95] shadow-xs mb-3 sm:mb-4 lg:mb-5 backdrop-blur-xs"
              >
                <span className="w-2 h-2 rounded-full bg-[#E91E8C] animate-pulse shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-sans font-semibold uppercase tracking-[0.25em] text-[#E91E8C]">
                  {badgeText}
                </span>
              </div>
            )}

            {/* Titular H1 */}
            <h1
              ref={headingRef}
              className="font-serif text-[1.85rem] leading-[1.12] sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[4.1rem] text-[#1A0E2E] dark:text-white font-normal tracking-tight mb-5 sm:mb-7 lg:mb-9"
            >
              {mainHeading}{' '}
              {highlightText && (
                <span className="italic font-light text-brand">
                  {highlightText}
                </span>
              )}
            </h1>

            {/* CTA Principal hacia el Catálogo & Redes Sociales */}
            <div ref={actionsRef} className="flex items-center gap-2 sm:gap-3 lg:gap-5">
              {ctaLabel && ctaUrl && (
                <Link
                  href={ctaUrl}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-full bg-brand hover:bg-brand-dark active:scale-95 text-white font-sans text-[11px] sm:text-sm font-bold uppercase tracking-wider shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group shrink-0"
                >
                  <span>{ctaLabel}</span>
                  <span className="text-sm sm:text-base transition-transform duration-300 group-hover:translate-x-1">→</span>
                </Link>
              )}

              {/* Redes Sociales */}
              {hasSocial && (
                <div
                  className="inline-flex items-center gap-2 sm:gap-2.5 text-neutral-700 bg-[#F4ECE3] backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full border border-[#C8AF95] shadow-xs shrink-0"
                  role="navigation"
                  aria-label="Redes sociales de Nénufar"
                >
                  {instagram && (
                    <a
                      href={instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram de Nénufar"
                      className="p-1 text-neutral-600 hover:text-[#E4405F] transition-all duration-200 hover:scale-115 cursor-pointer"
                    >
                      <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                      </svg>
                    </a>
                  )}
                  {facebook && (
                    <a
                      href={facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook de Nénufar"
                      className="p-1 text-neutral-600 hover:text-[#1877F2] transition-all duration-200 hover:scale-115 cursor-pointer"
                    >
                      <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                  )}
                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp de Nénufar"
                      className="p-1 text-neutral-600 hover:text-[#25D366] transition-all duration-200 hover:scale-115 cursor-pointer"
                    >
                      <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                    </a>
                  )}
                  {telegram && (
                    <a
                      href={telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Telegram de Nénufar"
                      className="p-1 text-neutral-600 hover:text-[#229ED9] transition-all duration-200 hover:scale-115 cursor-pointer"
                    >
                      <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-2.02 9.54c-.15.68-.56.84-1.12.52l-3.1-2.28-1.5 1.44c-.17.17-.31.31-.63.31l.22-3.17 5.77-5.21c.25-.22-.05-.35-.39-.12l-7.14 4.5-3.08-.96c-.67-.21-.68-.67.14-.99l12.04-4.64c.56-.2 1.05.14.81 1.06z" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* ESPACIO RESERVADO COLUMNA DERECHA (Desktop Grid >= 1024px)*/}
          {/* ========================================================= */}
          <div className="hidden lg:block lg:col-span-5 h-1 pointer-events-none" />

        </div>
      </div>

      {/* ========================================================= */}
      {/* FOTOGRAFÍA EN PRIMER PLANO (Sin recortes en las manos)    */}
      {/* ========================================================= */}
      <div
        ref={modelRef}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:right-8 xl:right-16 lg:bottom-0 xl:bottom-0 h-[47vh] sm:h-[55vh] md:h-[62vh] lg:h-[83vh] xl:h-[87vh] w-full lg:w-auto flex items-end justify-center pointer-events-none z-10 select-none overflow-visible"
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt={imageAlt}
          className="w-auto max-w-none h-full max-h-[78vh] lg:max-h-[87vh] object-contain object-bottom select-none drop-shadow-none will-change-transform subpixel-antialiased"
          style={{
            imageRendering: 'auto',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            WebkitTransform: 'translateZ(0)',
            transform: 'translateZ(0)',
            shapeRendering: 'geometricPrecision',
          }}
          loading="eager"
        />
      </div>
    </section>
  )
}




