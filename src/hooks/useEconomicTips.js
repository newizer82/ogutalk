import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useEconomicTips() {
  const [tips, setTips] = useState([])
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    fetchTips()
  }, [])

  async function fetchTips() {
    const { data, error } = await supabase
      .from('economic_tips')
      .select('*')
      .order('id', { ascending: true })
    if (error) {
      console.error('경제 상식 로딩 실패:', error)
      return
    }
    setTips(data)
    if (data.length > 0) {
      setCurrent(data[Math.floor(Math.random() * data.length)])
    }
  }

  function nextTip() {
    if (tips.length === 0) return
    setCurrent(tips[Math.floor(Math.random() * tips.length)])
  }

  return { tips, current, nextTip }
}
