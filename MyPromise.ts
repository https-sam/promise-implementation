enum State {
  Pending,
  Fulfilled,
  Rejected
}

class UncaughtPromise extends Error {
  constructor(err: any) {
    super(err)
    this.stack = `(in promise) err`
  }
}


class MyPromise {
  private thenCallbacks: Function[] = []
  private catchCallbacks: Function[] = []
  private value: any = null;
  private state: State = State.Pending;


  constructor(callback: (resolve: Function, reject: Function) => void) {
    try {
      callback(this.onResolve.bind(this), this.onReject.bind(this)) // binding
    } catch (e) {
      this.onReject(e)
    }
  }


  private executeCallbacks() {
    // console.log(this.state)
    if(this.state === State.Fulfilled) this.thenCallbacks.forEach(callback => callback(this.value))
    else if (this.state === State.Rejected) this.catchCallbacks.forEach(callback => callback(this.value))
  }


  /** Here we check if the val is an instance of a Promise **/
  private onResolve(val: any) {
    queueMicrotask(() => {
      if(this.state !== State.Pending) return; // handling when resolve is being called multiple times

      // if val is Promise, we bind it
      if(val instanceof MyPromise) {
        val.then(this.onResolve.bind(this), this.onReject.bind(this))
        return
      }

      this.value = val
      this.state = State.Fulfilled
      this.executeCallbacks()
      this.thenCallbacks.length = 0
    })
  }


  private onReject(val: any) {
    // queue task
    queueMicrotask(() => {
      if(this.state !== State.Pending) return; // handling when reject is being called multiple times
  
      // if val is Promise, we bind it
      if(val instanceof MyPromise) {
        val.then(this.onResolve.bind(this), this.onReject.bind(this))
        return
      }

      // Raise Uncaugh Promise Exeption
      if(this.catchCallbacks.length === 0) throw new UncaughtPromise(val)
  
      this.value = val
      this.state = State.Rejected
      this.executeCallbacks()
      this.catchCallbacks.length = 0
    })
  }

  // then can be called multiple times on the same instance of Promise, so we save callabck functions 
  // in an array
  public then(successCb: Function | undefined, failCb?: Function) {
    // console.log(this.state)

    // handle chaning
    return new MyPromise((resolve, reject) => {
      this.thenCallbacks.push((result: any) => {
        if(successCb === undefined) {
          resolve(result)
          return 
        }
        try {
          // if we have callback
          resolve(successCb(result))
        } catch(e) {
          reject(e)
        }
      })

      // for catch
      this.catchCallbacks.push((result: any) => {
        if(failCb === undefined) {
          reject(result)
          return 
        }
        try {
          // if we have callback
          resolve(failCb(result))
        } catch(e) {
          reject(e)
        }
      })
     
      
      this.executeCallbacks()
    })
  }


  public catch(callback: Function) {
    // simple way to do 
    return this.then(undefined, callback)

  }

  public finally(callback: Function) {
    return this.then((res: any) => {
      callback()
      return res
    }, (res: any) => {
      callback()
      throw res // being rejected so throw error so it will be catched
    })
  }



  
  /*******  Static Methods Defiend Here  *******/

  static resolve(val: any) {
    return new MyPromise((resolve) => {
      resolve(val)
    })
  }

  static reject(val: any) {
    return new MyPromise((resolve, reject) => {
      reject(val)
    })
  }


  /*** returns the first one that resolves, but doesnt return on reject ***/
  static any(promises: MyPromise[]) {
    let errs: any[] = [];
    let rejectedJob = 0

    return new MyPromise((resolve, reject) => {
      for(let i = 0; i < promises.length; i++) {
        let p = promises[i]
        p
        .then(resolve)
        .catch((val: any) => {
          errs[i] = val
          rejectedJob++
          //TODO throw Aggregate Error with errs, but not working in typescript, so currently throwing Error
          if(rejectedJob === promises.length-1) reject(new Error("All Promises rejected")) 
        })
      }
    })
  }


  /*** Returns the first promise ***/
  static race(promises: MyPromise[]) {
    return new MyPromise((resolve, reject) => {
      promises.forEach(p => {
        p.then(resolve).catch(reject)
      })
    })
  }


  static allSettled(promises: MyPromise[]) {
    let res: any[] = [];
    let completedJob = 0

    return new MyPromise((resolve) => {
      for(let i = 0; i < promises.length; i++) {
        let p = promises[i]
        p
        .then((val: any) => {
          res[i] = { status: State.Fulfilled, val }
        })
        .catch((reason: any) => {
          res[i] = { status: State.Rejected, reason }
        })
        .finally(() => {
          completedJob++;
          if(completedJob === promises.length-1) resolve(res) // all jobs (promises) completed
        })
      }
    })
  }


  /*** Execute all the promises and if there's any error, return the error ***/
  static all(promises: MyPromise[]) {
    let res: any[] = [];
    let completedJob = 0

    return new MyPromise((resolve, reject) => {
      for(let i = 0; i < promises.length; i++) {
        let p = promises[i]
        p
        .then((val: any) => {
          completedJob++
          res[i] = val
          if(completedJob === promises.length-1) resolve(res) // all jobs (promises) completed
        })
        .catch(reject)
      }
    })
  }
}

// const p = new MyPromise((resolve, reject) => reject("sam"))
// p.then((e: any) => console.log(e))


const p = (num: number) => {
  return new MyPromise((resolve, reject) => {
    if(num === 1) resolve("Sam")
    else reject("rejected!!")
  })
}


p(10)
console.log(p)



// module.exports = MyPromise