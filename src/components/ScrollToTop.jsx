import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)

    // Também rola qualquer <main> com overflow-y-auto (layout desktop)
    document.querySelectorAll('main').forEach(el => {
      el.scrollTop = 0
    })
  }, [pathname])

  return null
}
