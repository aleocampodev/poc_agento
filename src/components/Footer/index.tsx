import type { Footer } from '@/payload-types'
import { getCachedGlobal, getCachedCategories } from '@/utilities/getGlobals'
import Link from 'next/link'
import React from 'react'
import { LogoIcon } from '@/components/icons/logo'

const { COMPANY_NAME, SITE_NAME } = process.env


export function getCurrentCopyrightYear(): string {
  return new Date().getFullYear().toString()
}

export async function Footer() {
  const copyrightDate = getCurrentCopyrightYear()
  const copyrightName = COMPANY_NAME || SITE_NAME || 'Nénufar'

  let categories: { id: number | string; title: string; slug: string }[] = []
  try {
    const fetched = await getCachedCategories()
    if (fetched) categories = fetched
  } catch (_) {}

  return (
    <footer className="bg-[#3B032F] text-white border-t border-white/10 mt-auto">
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 py-16 lg:py-20">
          {/* Columna 1: Marca & Filosofía */}
          <div className="space-y-4">
            <Link className="flex items-center group py-1" href="/">
              <LogoIcon variant="blanco-horizontal" className="h-7 sm:h-8 w-auto shrink-0 transition-transform group-hover:scale-105" />
            </Link>
            <p className="text-purple-100/90 text-xs sm:text-sm leading-relaxed font-light">
              Joyería de autor tejida a mano con mostacilla calibrada y filigrana en Cartagena de Indias. Piezas con alma caribeña hechas para perdurar.
            </p>
            <div className="pt-2">
              <span className="inline-block px-3 py-1 rounded-full bg-[#E91E8C]/20 text-[#FF4FA3] text-[10px] uppercase tracking-[0.25em] font-medium border border-[#FF4FA3]/30">
                100% Hecho a Mano
              </span>
            </div>
          </div>

          {/* Columna 2: Colecciones (dinámicas desde CMS) */}
          <div className="space-y-4">
            <h4 className="font-serif text-base text-white font-medium tracking-wider uppercase">
              Colecciones
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-purple-100/80 font-light">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <li key={cat.slug}>
                    <Link href={`/shop?category=${cat.slug}`} className="hover:text-[#FF4FA3] transition-colors">
                      {cat.title}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <Link href="/shop" className="hover:text-[#FF4FA3] transition-colors">
                      Ver catálogo completo
                    </Link>
                  </li>
                </>
              )}
              <li>
                <Link href="/#talleres" className="hover:text-[#FF4FA3] transition-colors">
                  Talleres & Ferias
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Información & Ayuda */}
          <div className="space-y-4">
            <h4 className="font-serif text-base text-white font-medium tracking-wider uppercase">
              Información
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-purple-100/80 font-light">
              <li>
                <Link href="/#contacto" className="hover:text-[#FF4FA3] transition-colors">
                  Pedidos Personalizados
                </Link>
              </li>
              <li>
                <Link href="/find-order" className="hover:text-[#FF4FA3] transition-colors">
                  Consultar Pedido
                </Link>
              </li>
              <li>
                <Link href="/privacidad" className="hover:text-[#FF4FA3] transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="hover:text-[#FF4FA3] transition-colors">
                  Términos & Condiciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Taller en Cartagena */}
          <div className="space-y-4">
            <h4 className="font-serif text-base text-white font-medium tracking-wider uppercase">
              Taller Shirley
            </h4>
            <p className="text-purple-100/90 text-xs sm:text-sm leading-relaxed font-light">
              Cartagena de Indias, Colombia.<br />
              Atención personalizada vía Telegram y WhatsApp para asesorarte en tus piezas únicas.
            </p>
            <div className="pt-1 flex flex-col gap-3">
              <Link
                href="/#contacto"
                className="inline-block text-xs uppercase tracking-widest font-medium text-[#FF4FA3] hover:text-white underline underline-offset-4 decoration-[#FF4FA3]/50 transition-colors"
              >
                Escribir a Shirley →
              </Link>
              <div className="flex items-center gap-3 pt-1">
                <a
                  href="https://www.instagram.com/nenufar.co/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram de Nénufar"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#E4405F] flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>
                <a
                  href="https://www.facebook.com/nenufar.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook de Nénufar"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#1877F2] flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://wa.me/?text=Hola%20Shirley%2C%20quisiera%20consultar%20sobre%20las%20joyas%20artesanales%20de%20N%C3%A9nufar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp de Nénufar"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#25D366] flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                </a>
                <a
                  href="https://t.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Telegram de Nénufar"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#229ED9] flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-2.02 9.54c-.15.68-.56.84-1.12.52l-3.1-2.28-1.5 1.44c-.17.17-.31.31-.63.31l.22-3.17 5.77-5.21c.25-.22-.05-.35-.39-.12l-7.14 4.5-3.08-.96c-.67-.21-.68-.67.14-.99l12.04-4.64c.56-.2 1.05.14.81 1.06z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra Inferior en #3B032F */}
      <div className="border-t border-white/10 py-6 bg-[#3B032F]">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400 font-light">
          <p>
            &copy; {copyrightDate} {copyrightName}. Todos los derechos reservados.
          </p>
          <p className="flex items-center gap-1.5">
            <span>Hecho con dedicación en</span>
            <span className="text-neutral-200 font-normal">Cartagena de Indias, Colombia</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
