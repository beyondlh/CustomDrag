/**
 * Created by LH on 2015/11/19.
 */
define(["dojo/_base/declare", "dojo/_base/event", "dojo/on",
    "dojo/_base/lang", "dojo/sniff", "dojo/dom"], function (declare, event, on, lang) {

    var isIE = (document.all) ? true : false;

    var getDom = function (id) {
        return "string" == typeof id ? document.getElementById(id) : id;
    };

    var CurrentStyle = function (element) {
        return element.currentStyle || document.defaultView.getComputedStyle(element, null);
    };
    var Extend = function (destination, source) {
        for (var property in source) {
            destination[property] = source[property];
        }
    };

    return declare(null, {
        options: {//默认值
            Handle: "",//设置触发对象（不设置则使用拖放对象）
            Limit: false,//是否设置范围限制(为true时下面参数有用,可以是负数)
            mxLeft: 0,//左边限制
            mxRight: 9999,//右边限制
            mxTop: 0,//上边限制
            mxBottom: 9999,//下边限制
            mxContainer: "",//指定限制在容器内
            LockX: false,//是否锁定水平方向拖放
            LockY: false,//是否锁定垂直方向拖放
            Lock: false,//是否锁定
            Transparent: false,//是否透明
            onStart: function (evt) {
            },//开始移动时执行
            onMove: function (evt) {
            },//移动时执行
            onStop: function (evt) {
            }//结束移动时执行
        },

        constructor: function (dragDom, options) {
            this.Drag = getDom(dragDom);//拖放对象
            this._x = this._y = 0;//记录鼠标相对拖放对象的位置
            this._marginLeft = this._marginTop = 0;//记录margin
            this.SetOptions(options);

            this.Limit = !!this.options.Limit;
            this.mxLeft = parseInt(this.options.mxLeft);
            this.mxRight = parseInt(this.options.mxRight);
            this.mxTop = parseInt(this.options.mxTop);
            this.mxBottom = parseInt(this.options.mxBottom);

            this.LockX = !!this.options.LockX;
            this.LockY = !!this.options.LockY;
            this.Lock = !!this.options.Lock;

            this.onStart = this.options.onStart;
            this.onMove = this.options.onMove;
            this.onStop = this.options.onStop;

            this._Handle = getDom(this.options.Handle) || this.Drag;
            this._mxContainer = getDom(this.options.mxContainer) || null;

            this.Drag.style.position = "absolute";
            //透明
            if (isIE && !!this.options.Transparent) {
                //填充拖放对象
                with (this._Handle.appendChild(document.createElement("div")).style) {
                    width = height = "100%";
                    backgroundColor = "#fff";
                    filter = "alpha(opacity:0)";
                    fontSize = 0;
                }
            }
            //修正范围
            this.Repair();
            on(this._Handle, "mousedown", lang.hitch(this, function (e) {
                event.stop(e);
                this.Start(e);
            }));
        },


        //设置默认属性
        SetOptions: function (options) {
            this.options = {//默认值
                Handle: "",//设置触发对象（不设置则使用拖放对象）
                Limit: false,//是否设置范围限制(为true时下面参数有用,可以是负数)
                mxLeft: 0,//左边限制
                mxRight: 9999,//右边限制
                mxTop: 0,//上边限制
                mxBottom: 9999,//下边限制
                mxContainer: "",//指定限制在容器内
                LockX: false,//是否锁定水平方向拖放
                LockY: false,//是否锁定垂直方向拖放
                Lock: false,//是否锁定
                Transparent: false,//是否透明
                onStart: function (evt) {
                },//开始移动时执行
                onMove: function (evt) {
                },//移动时执行
                onStop: function (evt) {
                }//结束移动时执行
            };
            Extend(this.options, options || {});
        },

        //准备拖动
        Start: function (oEvent) {
            if (this.Lock) {
                return;
            }
            this.Repair();
            //记录鼠标相对拖放对象的位置
            this._x = oEvent.clientX - this.Drag.offsetLeft;
            this._y = oEvent.clientY - this.Drag.offsetTop;
            //记录margin
            this._marginLeft = parseInt(CurrentStyle(this.Drag).marginLeft) || 0;
            this._marginTop = parseInt(CurrentStyle(this.Drag).marginTop) || 0;

            //mousemove时移动 mouseup时停止
            this.mousemove = on(document, "mousemove", lang.hitch(this, function (evt) {
                this.Move(evt);
            }));

            this.mouseup = on(document, "mouseup", lang.hitch(this, function (evt) {
                this.Stop(evt);
            }));
            if (isIE) {
                //焦点丢失
                this.lostcapture = on(this._Handle, "lostcapture", lang.hitch(this, function (evt) {
                    this.Start(evt);
                }));
                //设置鼠标捕获
                this._Handle.setCapture();
            } else {
                //焦点丢失
                this.blur = on(window, "blur", lang.hitch(this, function (evt) {
                    this.Stop(evt);
                }));
                //阻止默认动作
                oEvent.preventDefault();
            }
            //附加程序
            this.onStart(oEvent);
        },


        //修正范围
        Repair: function () {
            if (this.Limit) {
                //修正错误范围参数
                this.mxRight = Math.max(this.mxRight, this.mxLeft + this.Drag.offsetWidth);
                this.mxBottom = Math.max(this.mxBottom, this.mxTop + this.Drag.offsetHeight);
                //如果有容器必须设置position为relative或absolute来相对或绝对定位，并在获取offset之前设置
                !this._mxContainer || CurrentStyle(this._mxContainer).position == "relative" || CurrentStyle(this._mxContainer).position == "absolute" || (this._mxContainer.style.position = "relative");
            }
        },


        //拖动
        Move: function (oEvent) {
            //判断是否锁定
            if (this.Lock) {
                this.Stop();
                return;
            }
            //清除选择
            window.getSelection ? window.getSelection().removeAllRanges() : document.selection.empty();
            //设置移动参数
            var iLeft = oEvent.clientX - this._x, iTop = oEvent.clientY - this._y;
            //设置范围限制
            if (this.Limit) {
                //设置范围参数
                var mxLeft = this.mxLeft, mxRight = this.mxRight, mxTop = this.mxTop, mxBottom = this.mxBottom;
                //如果设置了容器，再修正范围参数
                if (!!this._mxContainer) {
                    mxLeft = Math.max(mxLeft, 0);
                    mxTop = Math.max(mxTop, 0);
                    mxRight = Math.min(mxRight, this._mxContainer.clientWidth);
                    mxBottom = Math.min(mxBottom, this._mxContainer.clientHeight);
                }
                //修正移动参数
                iLeft = Math.max(Math.min(iLeft, mxRight - this.Drag.offsetWidth), mxLeft);
                iTop = Math.max(Math.min(iTop, mxBottom - this.Drag.offsetHeight), mxTop);
            }
            //设置位置，并修正margin
            if (!this.LockX) {
                this.Drag.style.left = iLeft - this._marginLeft + "px";
            }
            if (!this.LockY) {
                this.Drag.style.top = iTop - this._marginTop + "px";
            }
            //附加程序
            this.onMove(oEvent);
        },
        //停止拖动
        Stop: function (evt) {
            //移除事件
            this.mousemove.remove();
            this.mouseup.remove();
            if (this.isIE) {
                this.lostcapture.remove();
                this._Handle.releaseCapture();
            } else {
                this.blur.remove();
            }
            //附加程序
            this.onStop(evt);
        }
    });
});