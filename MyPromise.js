var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var State;
(function (State) {
    State[State["Pending"] = 0] = "Pending";
    State[State["Fulfilled"] = 1] = "Fulfilled";
    State[State["Rejected"] = 2] = "Rejected";
})(State || (State = {}));
var UncaughtPromise = /** @class */ (function (_super) {
    __extends(UncaughtPromise, _super);
    function UncaughtPromise(err) {
        var _this = _super.call(this, err) || this;
        _this.stack = "(in promise) err";
        return _this;
    }
    return UncaughtPromise;
}(Error));
var MyPromise = /** @class */ (function () {
    function MyPromise(callback) {
        this.thenCallbacks = [];
        this.catchCallbacks = [];
        this.value = null;
        this.state = State.Pending;
        try {
            callback(this.onResolve.bind(this), this.onReject.bind(this)); // binding
        }
        catch (e) {
            this.onReject(e);
        }
    }
    MyPromise.prototype.executeCallbacks = function () {
        var _this = this;
        // console.log(this.state)
        if (this.state === State.Fulfilled)
            this.thenCallbacks.forEach(function (callback) { return callback(_this.value); });
        else if (this.state === State.Rejected)
            this.catchCallbacks.forEach(function (callback) { return callback(_this.value); });
    };
    /** Here we check if the val is an instance of a Promise **/
    MyPromise.prototype.onResolve = function (val) {
        var _this = this;
        queueMicrotask(function () {
            if (_this.state !== State.Pending)
                return; // handling when resolve is being called multiple times
            // if val is Promise, we bind it
            if (val instanceof MyPromise) {
                val.then(_this.onResolve.bind(_this), _this.onReject.bind(_this));
                return;
            }
            _this.value = val;
            _this.state = State.Fulfilled;
            _this.executeCallbacks();
            _this.thenCallbacks.length = 0;
        });
    };
    MyPromise.prototype.onReject = function (val) {
        var _this = this;
        // queue task
        queueMicrotask(function () {
            if (_this.state !== State.Pending)
                return; // handling when reject is being called multiple times
            // if val is Promise, we bind it
            if (val instanceof MyPromise) {
                val.then(_this.onResolve.bind(_this), _this.onReject.bind(_this));
                return;
            }
            // Raise Uncaugh Promise Exeption
            if (_this.catchCallbacks.length === 0)
                throw new UncaughtPromise(val);
            _this.value = val;
            _this.state = State.Rejected;
            _this.executeCallbacks();
            _this.catchCallbacks.length = 0;
        });
    };
    // then can be called multiple times on the same instance of Promise, so we save callabck functions 
    // in an array
    MyPromise.prototype.then = function (successCb, failCb) {
        // console.log(this.state)
        var _this = this;
        // handle chaning
        return new MyPromise(function (resolve, reject) {
            _this.thenCallbacks.push(function (result) {
                if (successCb === undefined) {
                    resolve(result);
                    return;
                }
                try {
                    // if we have callback
                    resolve(successCb(result));
                }
                catch (e) {
                    reject(e);
                }
            });
            // for catch
            _this.catchCallbacks.push(function (result) {
                if (failCb === undefined) {
                    reject(result);
                    return;
                }
                try {
                    // if we have callback
                    resolve(failCb(result));
                }
                catch (e) {
                    reject(e);
                }
            });
            _this.executeCallbacks();
        });
    };
    MyPromise.prototype["catch"] = function (callback) {
        // simple way to do 
        return this.then(undefined, callback);
    };
    MyPromise.prototype["finally"] = function (callback) {
        return this.then(function (res) {
            callback();
            return res;
        }, function (res) {
            callback();
            throw res; // being rejected so throw error so it will be catched
        });
    };
    /*******  Static Methods Defiend Here  *******/
    MyPromise.resolve = function (val) {
        return new MyPromise(function (resolve) {
            resolve(val);
        });
    };
    MyPromise.reject = function (val) {
        return new MyPromise(function (resolve, reject) {
            reject(val);
        });
    };
    /*** returns the first one that resolves, but doesnt return on reject ***/
    MyPromise.any = function (promises) {
        var errs = [];
        var rejectedJob = 0;
        return new MyPromise(function (resolve, reject) {
            var _loop_1 = function (i) {
                var p_1 = promises[i];
                p_1
                    .then(resolve)["catch"](function (val) {
                    errs[i] = val;
                    rejectedJob++;
                    //TODO throw Aggregate Error with errs, but not working in typescript, so currently throwing Error
                    if (rejectedJob === promises.length - 1)
                        reject(new Error("All Promises rejected"));
                });
            };
            for (var i = 0; i < promises.length; i++) {
                _loop_1(i);
            }
        });
    };
    /*** Returns the first promise ***/
    MyPromise.race = function (promises) {
        return new MyPromise(function (resolve, reject) {
            promises.forEach(function (p) {
                p.then(resolve)["catch"](reject);
            });
        });
    };
    MyPromise.allSettled = function (promises) {
        var res = [];
        var completedJob = 0;
        return new MyPromise(function (resolve) {
            var _loop_2 = function (i) {
                var p_2 = promises[i];
                p_2
                    .then(function (val) {
                    res[i] = { status: State.Fulfilled, val: val };
                })["catch"](function (reason) {
                    res[i] = { status: State.Rejected, reason: reason };
                })["finally"](function () {
                    completedJob++;
                    if (completedJob === promises.length - 1)
                        resolve(res); // all jobs (promises) completed
                });
            };
            for (var i = 0; i < promises.length; i++) {
                _loop_2(i);
            }
        });
    };
    /*** Execute all the promises and if there's any error, return the error ***/
    MyPromise.all = function (promises) {
        var res = [];
        var completedJob = 0;
        return new MyPromise(function (resolve, reject) {
            var _loop_3 = function (i) {
                var p_3 = promises[i];
                p_3
                    .then(function (val) {
                    completedJob++;
                    res[i] = val;
                    if (completedJob === promises.length - 1)
                        resolve(res); // all jobs (promises) completed
                })["catch"](reject);
            };
            for (var i = 0; i < promises.length; i++) {
                _loop_3(i);
            }
        });
    };
    return MyPromise;
}());
var p = new MyPromise(function (resolve, reject) { return reject("sam"); });
p.then(function (e) { return console.log(e); });
// const p = (num: number) => {
//   return new MyPromise((resolve, reject) => {
//     resolve("Sam")
//     // else reject("rejected!!")
//   })
// }
// p(1).then((data: any) => {
//   console.log(data)
// })
// .catch((e: any) => console.log(e)) 
module.exports = MyPromise;
