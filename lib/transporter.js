require('em')('transporter',function(em,lib,_){

    var  as = em('as-contrib'),
         whenEnv = em('whenEnv'),
         enums = as.enums,
         inv = as.invokable,
         valids = as.validators,
         util = as.AppStack.Utility,
         rootPath =/^\.\//,
         localPath = /^file:\/\/$|^file:\/\/\/$/,
         trans = this.exports = { base:{}};
  
          whenEnv.node(function(){
            trans.state = new Error("Not Supported!");
          });

          whenEnv.browser(function(){
              
              var base = trans.base;
              
              trans.request = function(req,type){};
              
              base.addEvent = function(elem,type,fn){
                 if(valids.exists(elem.addEventListener)) return elem.addEventListener(type,fn,false);
                 if(valids.exists(elem.attachEvent)) return elem.attachEvent(type,fn,false);
                 return;
              };
              
              base.removeEvent = function(elem,type,fn){
                 if(valids.exists(elem.removeEventListener)) return elem.removeEventListener(type,fn,false);
                 if(valids.exists(elem.detachEvent)) return elem.detachEvent(type,fn,false);
                 return;
              };
              
              base.callbackFilter = function(id,value){
                if(this.elem[value] === id) return this.elem;
              };

              base.callbackDistriubtor = function(gid){
                  var callbacks = [];
                  var picker = enums.pickWith(this.callbackFilter)(callbacks);

                  return {
                    add: function(id,fn){
                      if(callbacks.indexOf(fn) !== -1) return;
                      fn[gid] = id;
                      callbacks.push(fn);
                    },
                    fire: function(id){
                      var id = picker(id,gid);
                      var args = enums.rest(arguments);
                      enums.each(id,function(e){
                        return e.apply(this,args);
                      });
                    },
                    flush: function(){
                      callbacks.length = 0;
                    }
                  };
              };

              base.requestObject = function(url,fn,meta){
                var ob = document.createElement('object'),
                    ax = as.AppStack.Promise.create();
               
                meta.auto = (valids.truthy(meta.jsonp) ? false : true);

                ob.setAttribute('data',url);
                if(valids.exists(meta.type)) ob.setAttribute('type',meta.type);
                ob.setAttribute('script-loader','base.transporter-js');

                // ob.onload = ob.onreadystatechange = function(){
                //   if(!ob.readyState || ob.readyState.match(/^loaded$|^completed$/ig)){
                //     if(valids.truthy(meta.auto)) ax.resolve(ob,{req:url});
                //     ob.onreadystatechange = ob.onload = null;
                //   }
                // };
                
                base.addEvent(ob,'load',function AddRequest(){
                    if(valids.truthy(meta.auto)) ax.resolve(ob,meta);
                    base.removeEvent(ob,'load',AddRequest);
                });

                base.addEvent(ob,'error',function ErrorRequest(){
                    ax.reject(ob,meta);
                    base.removeEvent(ob,'error',ErrorRequest);
                });
                
                meta.req = url;
                meta.xhr = ob;
                meta.isAsync = true;
                meta.request = (valids.truthy(meta.auto) ? ax.promise() : ax);
                return fn.call(meta);
              };

              base.requestScript = function(url,fn,meta){
                var script = document.createElement('script'),
                    ax = as.AppStack.Promise.create();
                
                meta.auto = (valids.truthy(meta.jsonp) ? false : true);

                script.setAttribute('src',url);
                if(valids.exists(meta.type)) script.setAttribute('type',meta.type);
                script.setAttribute('script-loader','base.transporter-js');

                // script.onload = script.onreadystatechange = function(){
                //   if(!script.readyState || script.readyState.match(/^loaded$|^completed$/ig)){
                //     if(valids.truthy(meta.auto)) ax.resolve(ob,{req:url});
                //     script.onreadystatechange = script.onload = null;
                //   }
                // };

                base.addEvent(script,'load',function AddRequest(){
                    if(valids.truthy(meta.auto)) ax.resolve(script,meta);
                    base.removeEvent(script,'load',AddRequest);
                });

                base.addEvent(script,'error',function ErrorRequest(){
                    ax.reject(script,meta);
                    base.removeEvent(script,'error',ErrorRequest);
                });
                
                meta.req = url;
                meta.xhr = script;
                meta.request = (valids.truthy(meta.auto) ? ax.promise() : ax);
                meta.isAsync = true;
                return fn.call(meta);
              };
              
              base.setXHRHeaders = function(xhr){
                  return function(headers){
                    if(valids.truthy(headers.type)) xhr.responseType = headers.type;
                    enums.each(headers,function(e,i){
                       xhr.setRequestHeader(i,e);
                    });

                    return xhr;
                  }
              };

              base.analyzeQueryString = inv.dispatch(function(n){
                  if(!valids.isString(n)) return;
                  var query = decodeURIComponent(n);
                  return inv.invokeWith(query,'split');
              },function(n){
                  if(!valids.isObject(n)) return;
                  var query = enums.reduce(n,function(memo,e,i){
                      var key = encodeURIComponent(i) || i;
                      memo.push(key+'='+encodeURIComponent(e));
                      return memo;
                  },[]);
                  return inv.invokeWith(query,'join');
              });

              base.queryString = inv.compose(function(n){ 
                return n('&');
              },inv.apply,base.analyzeQueryString);

              base.response = function(xhr){
                 var res = {text:xhr.responseText,xml: xhr.responseXML};
                 try{
                    res.json = JSON.parse(xhr.responseText);
                 }catch(e){
                    res.error = e;
                    return res;
                 }
                 return res;
              };
              
              base.Ajax = function(req,method,async){
                 var xhr = this.XHR(true);
                 return function(fn,wait){
                   if(valids.falsy(wait)) xhr.open(method,req,async || true);
                   return fn.call(null,xhr,method,req,async);
                 };
              };

              base.AjaxSoft = function(req,method){
                return this.Ajax(req,method)(function(xhr,m,r,a){
                  var meta = {req:req,method:method},ax = as.AppStack.Promise.create();
                  return function(fn){
                     xhr.onreadystatechange = function(){
                        if(xhr.readyState === 4){
                            var status = xhr.status;
                            ((!status || (status >= 200 && status < 300)) ? 
                             ax.resolve(base.response(xhr),xhr,meta) :
                             ax.reject(base.response(xhr),xhr,meta));
                        }
                     };
                     meta.headers = base.setXHRHeaders(xhr);
                     meta.query = base.queryString;
                     meta.xhr = xhr;
                     meta.request = ax;
                     meta.isAsync = !!a;
                    return fn.call(meta);
                  };
                });
              };

              base.AjaxPoll = function(req,method,ms){
                 return this.Ajax(req,method)(function(xhr,m,r,a){
                    var meta = {req:req,method:method},ax = as.AppStack.Promise.create();
                    meta.isAsync = !!a;
                    return function(fn){
                      var poll = _.setInterval(function(){
                           if(xhr && xhr.readyState === 4){
                              _.clearInterval(poll);
                              var status = xhr.status;
                              ((!status || (status >= 200 && status < 300)) ? 
                               ax.resolve(base.response(xhr),xhr,meta) :
                               ax.reject(base.response(xhr),xhr,meta));
                           }
                       },ms);
                       meta.headers = base.setXHRHeaders(xhr);
                       meta.query = base.queryString;
                       meta.xhr = xhr;
                       meta.request = ax;
                      return fn.call(meta);
                    };
                 },false);
              };
              
              base.JSONP = function(req,callback,meta){
                  var meta = meta || {};
                  if(!valids.exists(meta.fnName))  meta.fnName = "transporter_jsonp_callback";
                  if(!valids.exists(meta.bust))  meta.bust = false;
                  //if(!valids.exists(meta.type))  meta.type = 'text/plain';
                  
                  meta.jsonp = true;
                  
                  meta.pid = enums.someString(4);

                  var callbackName = meta.fnName+"_"+meta.pid;
                  var url = req + encodeURIComponent(callbackName) +(meta.bust ? ('&'+ Math.random()) : '');
                  
                  _[callbackName] = function(){
                      trans.JSONCallbackPool.fire.apply(null,[meta.pid].concat(enums.toArray(arguments)));
                      delete _[callbackName];
                  };
                  

                  return function(fn){
                    return base.requestScript(url,function(){
                      var self = this, req = this.request, first = _.document.getElementsByTagName('script')[0];

                      this.xhr.setAttribute('jpid',this.pid);
                      trans.JSONCallbackPool.add(this.pid,function(){
                         self.data = enums.toArray(arguments)[0];
                         req.resolve(self.data);
                      });

                      first.parentNode.insertBefore(this.xhr,first);
                      
                      this.request = this.request.promise();
                      return fn.call(this);
                    },meta);
                  };
              };

              base._ieXHR = inv.dispatch(function(){
                  var i;
                  if(valids.exists(i = new _.ActiveXObject('Msxml2.XMLHTTP.6.0'))) return i;
              },function(){
                  var i;
                  if(valids.exists(i = new _.ActiveXObject('Msxml2.XMLHTTP.3.0'))) return i;
              },function(){
                  var i;
                  if(valids.exists(i = new _.ActiveXObject('Microsoft.XMLHTTP'))) return i;
              });
                  
              base.XHR = inv.dispatch(function(){
                  var i;
                  if(valids.exists(i = new _.XMLHttpRequest())) return i;
              },base._ieXHR);
              
             trans.JSONCallbackPool = base.callbackDistriubtor('JSONP_ID');
          });
   
            
    
},this);
