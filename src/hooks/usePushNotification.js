import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

export function usePushNotification(userId) {
  const [subscription, setSubscription] = useState(null)
  const [supported, setSupported]       = useState(false)
  const [permission, setPermission]     = useState('default')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)

  useEffect(() => {
    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    setSupported(isSupported)

    if (isSupported) {
      setPermission(Notification.permission)
      checkExistingSubscription()
    }
  }, [userId])

  const checkExistingSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
    } catch (err) {
      console.error('[Push] 기존 구독 확인 실패:', err)
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!userId) {
      setError('로그인이 필요합니다')
      return false
    }
    if (!VAPID_PUBLIC_KEY) {
      setError('VAPID 키가 설정되지 않았습니다')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      // 1. 알림 권한 요청
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') throw new Error('알림 권한이 거부되었습니다')

      // 2. Service Worker 준비 대기
      const registration = await navigator.serviceWorker.ready

      // 3. Push 구독 생성
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // 4. Supabase에 저장
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id:      userId,
          endpoint:     sub.endpoint,
          p256dh:       arrayBufferToBase64(sub.getKey('p256dh')),
          auth:         arrayBufferToBase64(sub.getKey('auth')),
          user_agent:   navigator.userAgent.slice(0, 200),
          last_used_at: new Date().toISOString(),
        }, { onConflict: 'user_id,endpoint' })

      if (dbError) throw dbError

      setSubscription(sub)
      return true
    } catch (err) {
      console.error('[Push] 구독 실패:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [userId])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (subscription) {
        // Supabase에서 먼저 삭제
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint)

        // 브라우저 구독 해제
        await subscription.unsubscribe()
      }
      setSubscription(null)
      return true
    } catch (err) {
      console.error('[Push] 구독 해제 실패:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [userId, subscription])

  return {
    supported,
    permission,
    isSubscribed: !!subscription,
    loading,
    error,
    subscribe,
    unsubscribe,
  }
}
