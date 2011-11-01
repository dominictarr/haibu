process.nextTick(function () {
  console.error("CRASH")
  throw new Error('crash!')
})

