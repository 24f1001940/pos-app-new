import { AnimatePresence, motion } from 'framer-motion'

const transitionVariants = {
  initial: { opacity: 0, y: 14, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(8px)' },
}

export function PageTransition({ routeKey, children }) {
  const MotionDiv = motion.div

  return (
    <AnimatePresence mode="wait">
      <MotionDiv
        key={routeKey}
        variants={transitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="min-h-full"
      >
        {children}
      </MotionDiv>
    </AnimatePresence>
  )
}
