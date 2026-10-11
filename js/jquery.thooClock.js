// thooClock, a jQuery Clock with alarm function
// by Thomas Haaf aka thooyork, http://www.smart-sign.com
// Twitter: @thooyork
// Version 1.0.2
// Copyright (c) 2013 thooyork

// MIT License, http://opensource.org/licenses/MIT


(function( $ ) {

    $.fn.thooClock = function(options) {
        
        this.each(function() {

        var cnv,
                ctx,
                el,
                defaults,
                settings,
                radius,
                dialColor,
                dialBackgroundColor,
                secondHandColor,
                minuteHandColor,
                hourHandColor,
                alarmHandColor,
                alarmHandTipColor,
                timeCorrection,
                x,
                y,
                pragotronImg,
                pragotronImgReady = false,
                pragotronImgLoading = false,
                clockTimer = null,
                clockTimerType = null,
                clockLoopCount = 0,
                destroyed = false,
                nightModeProgress = 0,
                nightModeTarget = 0,
                nightModeTransitionFrom = 0,
                nightModeTransitionStart = null,
                nightModeTransitionFrame = null,
                nightModeTransitionFrameType = null,
                nightModeTransitionDuration = 600;

       defaults = {
                size: 250,
                dialColor: '#000000',
                dialBackgroundColor:'transparent',
                secondHandColor: '#000000',
                minuteHandColor: '#000000',
                hourHandColor: '#000000',
                alarmHandColor: '#FFFFFF',
                alarmHandTipColor: '#026729',
                timeCorrection: {
                    operator: '+',
                    hours: 0,
                    minutes: 0
                },
                alarmCount: 0,
                showNumerals: true,
                numerals: [
                    {1:"1"},
                    {2:"2"},
                    {3:"3"},
                    {4:"4"},
                    {5:"5"},
                    {6:"6"},
                    {7:"7"},
                    {8:"8"},
                    {9:"9"},
                    {10:"10"},
                    {11:"11"},
                    {12:"12"}
                ],
                sweepingMinutes: true,
                sweepingSeconds: false,
                numeralFont: 'arial',
                brandFont: 'arial',
                secondHandEnabled: true,
                showMinuteLines: true
            };

            settings = $.extend({}, defaults, options);

            el = this;

            el.size = settings.size;
            el.dialColor = settings.dialColor;
            el.dialBackgroundColor = settings.dialBackgroundColor;
            el.secondHandColor = settings.secondHandColor;
            el.minuteHandColor = settings.minuteHandColor;
            el.hourHandColor = settings.hourHandColor;
            el.alarmHandColor = settings.alarmHandColor;
            el.alarmHandTipColor = settings.alarmHandTipColor;
            el.timeCorrection = settings.timeCorrection;
            el.showNumerals = settings.showNumerals;
            el.numerals = settings.numerals;
            el.numeralFont = settings.numeralFont;

            el.brandText = settings.brandText;
            el.brandText2 = settings.brandText2;
            el.brandFont = settings.brandFont;
            
            el.alarmCount = settings.alarmCount;
            el.alarmTime = settings.alarmTime;
            el.onAlarm = settings.onAlarm;
            el.offAlarm = settings.offAlarm;

            el.onEverySecond = settings.onEverySecond;

            el.sweepingMinutes = settings.sweepingMinutes;
            el.sweepingSeconds = settings.sweepingSeconds;

            el.secondHandEnabled = settings.secondHandEnabled;
            el.showMinuteLines = settings.showMinuteLines;

            x=0; //loopCounter for Alarm
            
            cnv = document.createElement('canvas');
            ctx = cnv.getContext('2d');

            cnv.width = this.size;
            cnv.height = this.size;
            //append canvas to element
            $(cnv).appendTo(el);

            radius = parseInt(el.size/2, 10);
            //translate 0,0 to center of circle:
            ctx.translate(radius, radius); 

            if((el.brandText === undefined || el.brandText === "")
                && (el.brandText2 === undefined || el.brandText2 === "")) {
                pragotronImg = new Image();
                pragotronImgLoading = true;
                pragotronImg.onload = function() {
                    pragotronImgReady = true;
                    pragotronImgLoading = false;
                };
                pragotronImg.onerror = function() {
                    pragotronImgReady = false;
                    pragotronImgLoading = false;
                    console.error('Failed to load the SVG file.');
                };
                pragotronImg.src = 'images/tabule/pragotron.svg';
                if(pragotronImg.complete && pragotronImg.naturalWidth > 0) {
                    pragotronImgReady = true;
                    pragotronImgLoading = false;
                }
            }

            function toRadians(deg){
                return ( Math.PI / 180 ) * deg;
            }     

            function isNightMode(){
                var screen = el.closest ? el.closest('#skrin') : null;
                return screen !== null && screen.classList.contains('night-mode');
            }

            function getCurrentTime(){
                return new Date().getTime();
            }

            function updateNightModeProgress(){
                if(nightModeTransitionStart === null){
                    return;
                }

                var elapsed = getCurrentTime() - nightModeTransitionStart,
                    linearProgress = Math.max(
                        0,
                        Math.min(1, elapsed / nightModeTransitionDuration)
                    ),
                    easedProgress = linearProgress * linearProgress
                        * (3 - (2 * linearProgress));

                nightModeProgress = nightModeTransitionFrom
                    + ((nightModeTarget - nightModeTransitionFrom) * easedProgress);

                if(linearProgress >= 1){
                    nightModeProgress = nightModeTarget;
                    nightModeTransitionStart = null;
                }
            }

            function scheduleNightModeTransitionFrame(){
                if(destroyed
                    || document.hidden
                    || nightModeTransitionFrame !== null
                    || nightModeTransitionStart === null){
                    return;
                }

                var callback = function(){
                    nightModeTransitionFrame = null;
                    nightModeTransitionFrameType = null;
                    updateNightModeProgress();
                    drawCurrentFrame();
                    scheduleNightModeTransitionFrame();
                };

                if(typeof window.requestAnimationFrame === 'function'){
                    nightModeTransitionFrameType = 'frame';
                    nightModeTransitionFrame = window.requestAnimationFrame(callback);
                } else {
                    nightModeTransitionFrameType = 'timeout';
                    nightModeTransitionFrame = window.setTimeout(callback, 16);
                }
            }

            function getNightModeProgress(){
                var target = isNightMode() ? 1 : 0;

                if(target !== nightModeTarget){
                    updateNightModeProgress();
                    nightModeTransitionFrom = nightModeProgress;
                    nightModeTarget = target;
                    nightModeTransitionStart = getCurrentTime();
                    scheduleNightModeTransitionFrame();
                }

                updateNightModeProgress();
                scheduleNightModeTransitionFrame();
                return nightModeProgress;
            }

            nightModeTarget = isNightMode() ? 1 : 0;
            nightModeProgress = nightModeTarget;
            nightModeTransitionFrom = nightModeTarget;

            function isClockLightEnabled(){
                return window.getComputedStyle(el)
                    .getPropertyValue('--clock-light-enabled')
                    .trim() !== '0';
            }

            function getNightClockIntensity(){
                if(!isClockLightEnabled()){
                    return 0;
                }

                var intensity = parseFloat(
                    window.getComputedStyle(el).getPropertyValue('--clock-light-intensity')
                );

                if(isNaN(intensity)){
                    return 1;
                }

                return Math.max(0, Math.min(1, intensity));
            }

            function getClockLightIntensity(){
                var progress = getNightModeProgress(),
                    nightIntensity = getNightClockIntensity();

                return 1 + ((nightIntensity - 1) * progress);
            }

            function getNightClockColor(){
                var intensity = getNightClockIntensity();
                var baseClockColor = { r: 71, g: 71, b: 71 };
                var currentFullLightColor = { r: 11, g: 27, b: 59 };
                var newFullLightColor = { r: 0, g: 15, b: 74 };
                var startColor;
                var endColor;
                var colorProgress;

                if(intensity <= 0.5){
                    startColor = baseClockColor;
                    endColor = currentFullLightColor;
                    colorProgress = intensity * 1.6;
                } else {
                    startColor = {
                        r: baseClockColor.r
                            + ((currentFullLightColor.r - baseClockColor.r) * 0.8),
                        g: baseClockColor.g
                            + ((currentFullLightColor.g - baseClockColor.g) * 0.8),
                        b: baseClockColor.b
                            + ((currentFullLightColor.b - baseClockColor.b) * 0.8)
                    };
                    endColor = newFullLightColor;
                    colorProgress = (intensity - 0.5) * 2;
                }

                var red = Math.round(
                    startColor.r + ((endColor.r - startColor.r) * colorProgress)
                );
                var green = Math.round(
                    startColor.g + ((endColor.g - startColor.g) * colorProgress)
                );
                var blue = Math.round(
                    startColor.b + ((endColor.b - startColor.b) * colorProgress)
                );

                return 'rgb(' + red + ', ' + green + ', ' + blue + ')';
            }

            function parseColor(color){
                var value = String(color || '').trim(),
                    hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i),
                    rgbMatch = value.match(
                        /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i
                    ),
                    hex;

                if(hexMatch){
                    hex = hexMatch[1];
                    if(hex.length === 3){
                        hex = hex.replace(/(.)/g, '$1$1');
                    }

                    return {
                        r: parseInt(hex.substring(0, 2), 16),
                        g: parseInt(hex.substring(2, 4), 16),
                        b: parseInt(hex.substring(4, 6), 16)
                    };
                }

                if(rgbMatch){
                    return {
                        r: Number(rgbMatch[1]),
                        g: Number(rgbMatch[2]),
                        b: Number(rgbMatch[3])
                    };
                }

                return null;
            }

            function blendColors(dayColor, nightColor, progress){
                var day = parseColor(dayColor),
                    night = parseColor(nightColor);

                if(!day || !night){
                    return progress < 0.5 ? dayColor : nightColor;
                }

                return 'rgb('
                    + Math.round(day.r + ((night.r - day.r) * progress)) + ', '
                    + Math.round(day.g + ((night.g - day.g) * progress)) + ', '
                    + Math.round(day.b + ((night.b - day.b) * progress)) + ')';
            }

            function getClockLightVisualIntensity(){
                var intensity = getClockLightIntensity();
                return intensity <= 0.5
                    ? intensity * 1.6
                    : 0.8 + ((intensity - 0.5) * 1.6);
            }

            function getClockLightShadowBlur(blur){
                var intensity = getClockLightIntensity();
                return intensity <= 0.5
                    ? blur
                    : blur * (1 + ((intensity - 0.5) * 1.6));
            }

            function getClockColor(color){
                var progress = getNightModeProgress();
                return progress === 0
                    ? color
                    : blendColors(color, getNightClockColor(), progress);
            }

            function setHandShadow(blur, offsetX, offsetY){
                // The whole clock is rendered through invert(1). A white,
                // low-opacity source shadow therefore becomes a subtle dark
                // shadow on the visible clock instead of a bright halo.
                ctx.shadowColor = 'rgba(255,255,255,.24)';
                ctx.shadowBlur = Math.max(1, blur * 0.6);
                ctx.shadowOffsetX = offsetX;
                ctx.shadowOffsetY = offsetY;
            }

            function clearClockShadow(){
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }

            function drawDial(color, bgcolor){
                var dialRadius,
                    dialBackRadius,
                    i,
                    ang,
                    sang,
                    cang,
                    sx,
                    sy,
                    ex,
                    ey,
                    nx,
                    ny,
                    text,
                    textSize,
                    textWidth,
                    brandtextWidth,
                    brandtextWidth2;
                var nightModeProgress = getNightModeProgress();
                var nightMode = nightModeProgress > 0;
                var clockLightIntensity = getClockLightIntensity();
                var dialStrokeColor = getClockColor(color);

                dialRadius = parseInt(radius-(el.size/50), 10);
                dialBackRadius = radius-(el.size/400);

                clearClockShadow();
                ctx.beginPath();
                ctx.arc(0,0,dialBackRadius,0,360,false);
                ctx.fillStyle = bgcolor;
                ctx.fill();
                 
                for (i=1; i<=60; i+=1) {
                    ang=Math.PI/30*i;
                    sang=Math.sin(ang);
                    cang=Math.cos(ang);
                    //hour marker/numeral
                    if (i % 5 === 0) {
                        ctx.lineWidth = parseInt(el.size/30,10);//parseInt(el.size/50,10);
                        sx = sang * (dialRadius - dialRadius/5);
                        sy = cang * -(dialRadius - dialRadius/5);
                        ex = sang * dialRadius;
                        ey = cang * - dialRadius;
                        nx = sang * (dialRadius - dialRadius/4.2);
                        ny = cang * -(dialRadius - dialRadius/4.2);
                        marker = i/5;

                        ctx.textBaseline = 'middle';
                        textSize = parseInt(el.size/13,10);
                        ctx.font = '100 ' + textSize + 'px ' + el.numeralFont;
                        ctx.beginPath();
                        ctx.fillStyle = dialStrokeColor;

                        if(el.showNumerals && el.numerals.length > 0){
                            el.numerals.map(function(numeral){
                                if(marker == Object.keys(numeral)){
                                    textWidth = ctx.measureText (numeral[marker]).width;
                                    ctx.fillText(numeral[marker],nx-(textWidth/2),ny);
                                }
                            });
                        }
                    //minute marker
                    } else {
                        if(el.showMinuteLines) {
                            ctx.lineWidth = parseInt(el.size/85,10);//parseInt(el.size/100,10);
                            sx = sang * (dialRadius - dialRadius/15);
                            sy = cang * -(dialRadius - dialRadius/15);
                            ex = sang * (dialRadius + dialRadius/50);
                            ey = cang * - (dialRadius + dialRadius/50);
                        } else {
                            continue;
                        }
                    }

                    ctx.beginPath();
                    ctx.strokeStyle = dialStrokeColor;
                    ctx.lineCap = "square";//"round";
                    ctx.moveTo(sx,sy);
                    ctx.lineTo(ex,ey);
                    if(nightMode && clockLightIntensity > 0){
                        ctx.shadowColor =
                            'rgba(0, 28, 82, ' +
                            (0.42 * getClockLightVisualIntensity() * nightModeProgress)
                            + ')';
                        ctx.shadowBlur = getClockLightShadowBlur(parseInt(el.size/48, 10));
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                    } else {
                        clearClockShadow();
                    }
                    ctx.stroke();
                } 

                clearClockShadow();

                if(el.brandText !== undefined){
                    ctx.font = '100 ' + parseInt(el.size/28,10) + 'px ' + el.brandFont;
                    brandtextWidth = ctx.measureText (el.brandText).width;
                    ctx.fillText(el.brandText,-(brandtextWidth/2),(el.size/6)); 
                }

                if(el.brandText2 !== undefined){
                    ctx.textBaseline = 'middle';
                    ctx.font = '100 ' + parseInt(el.size/44,10) + 'px ' + el.brandFont;
                    brandtextWidth2 = ctx.measureText (el.brandText2).width;
                    ctx.fillText(el.brandText2,-(brandtextWidth2/2),(el.size/5)); 
                }

                // Draw the already loaded logo. Creating an Image on every
                // animation frame makes the logo disappear while it reloads.
                if(pragotronImgReady) {
                    var pragotronWidth = ((pragotronImg.naturalWidth || pragotronImg.width) * 0.8);
                    var pragotronHeight = ((pragotronImg.naturalHeight || pragotronImg.height) * 0.8);
                    var pragotronX = -(pragotronWidth/2);
                    var pragotronY = el.size/8;

                    ctx.save();
                    ctx.globalAlpha = 1 - (0.28 * getNightModeProgress());
                    ctx.drawImage(pragotronImg, pragotronX, pragotronY, pragotronWidth, pragotronHeight);
                    ctx.restore();
                }
            }

            function twelvebased(hour){
                if(hour >= 12){
                    hour = hour - 12;
                }
                return hour;
            }

            function drawHand(length){
               ctx.beginPath();
               ctx.moveTo(0,0);
               ctx.lineTo(0, length * -1);
               ctx.stroke();
            }
            
            function drawSecondHand(milliseconds, seconds, color){
                if(el.secondHandEnabled) {
                    var shlength = (radius)-(el.size/40);
                    
                    ctx.save();
                    ctx.lineWidth = parseInt(el.size/150,10);
                    ctx.lineCap = "square";//"round";
                    ctx.strokeStyle = getClockColor(color);

                    ctx.rotate( toRadians((milliseconds * 0.006) + (seconds * 6)));

                    setHandShadow(
                        parseInt(el.size/80,10),
                        parseInt(el.size/200,10),
                        parseInt(el.size/200,10)
                    );

                    drawHand(shlength);

                    //tail of secondhand
                    ctx.beginPath();
                    ctx.moveTo(0,0);
                    ctx.lineTo(0, shlength/15);
                    ctx.lineWidth = parseInt(el.size/30,10);
                    ctx.stroke();

                    //round center
                    ctx.beginPath();
                    ctx.arc(0, 0, parseInt(el.size/30,10), 0, 360, false);
                    ctx.fillStyle = getClockColor(color);

                    ctx.fill();
                    ctx.restore();
                }
            }

            function drawMinuteHand(minutes, color){
                var mhlength = el.size/2.25;
                ctx.save();
                ctx.lineWidth = parseInt(el.size/35,10);//parseInt(el.size/50,10);
                ctx.lineCap = "square";//"round";
                ctx.strokeStyle = getClockColor(color);
               
                if(!el.sweepingMinutes){
                    minutes.isInteger ? minutes : minutes = parseInt(minutes);
                }
                ctx.rotate( toRadians(minutes * 6));

                setHandShadow(
                    parseInt(el.size/50,10),
                    parseInt(el.size/250,10),
                    parseInt(el.size/250,10)
                );

                drawHand(mhlength);

                //tail
                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.lineTo(0, mhlength/5);
                ctx.lineWidth = parseInt(el.size/35,10);
                ctx.stroke();
                
                ctx.restore();
            }

            function drawHourHand(hours, color){
                var hhlength = el.size/3.5;
                ctx.save();
                ctx.lineWidth = parseInt(el.size/20, 10);//parseInt(el.size/25, 10);
                ctx.lineCap = "square";//"round";
                ctx.strokeStyle = getClockColor(color);
                ctx.rotate( toRadians(hours * 30));

                setHandShadow(
                    parseInt(el.size/50, 10),
                    parseInt(el.size/300, 10),
                    parseInt(el.size/300, 10)
                );

                drawHand(hhlength);
                
                //tail
                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.lineTo(0, hhlength/5);
                ctx.lineWidth = parseInt(el.size/20,10);
                ctx.stroke();

                ctx.restore();
            }

            function timeToDecimal(time){
                var h,
                    m;
                if(time !== undefined){
                    h = twelvebased(time.getHours());
                    m = time.getMinutes();
                }
                return parseInt(h,10) + (m/60);
            }

            function drawAlarmHand(alarm, color, tipcolor){

                var ahlength = el.size/2.4;
                
                ctx.save();
                ctx.lineWidth = parseInt(el.size/30, 10);
                ctx.lineCap = "butt";
                ctx.strokeStyle = getClockColor(color);

                //decimal equivalent to hh:mm
                alarm = timeToDecimal(alarm);
                ctx.rotate( toRadians(alarm * 30));

                setHandShadow(
                    parseInt(el.size/55, 10),
                    parseInt(el.size/300, 10),
                    parseInt(el.size/300, 10)
                );

                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.lineTo(0, (ahlength-(el.size/10)) * -1);
                ctx.stroke();

                ctx.beginPath();
                ctx.strokeStyle = getClockColor(tipcolor);
                ctx.moveTo(0, (ahlength-(el.size/10)) * -1);
                ctx.lineTo(0, (ahlength) * -1);
                ctx.stroke();

                //round center
                ctx.beginPath();
                ctx.arc(0, 0, parseInt(el.size/24, 10), 0, 360, false);
                ctx.fillStyle = getClockColor(color);
                ctx.fill();
                ctx.restore();
            }  

            y=0;

            function cancelScheduledTick(){
                if(clockTimer === null){
                    return;
                }

                if(clockTimerType === 'frame'){
                    window.cancelAnimationFrame(clockTimer);
                } else {
                    window.clearTimeout(clockTimer);
                }

                clockTimer = null;
                clockTimerType = null;
            }

            function scheduleNextTick(callback){
                if(destroyed || document.hidden){
                    return;
                }

                if(pragotronImgLoading
                    || el.secondHandEnabled
                    || el.sweepingMinutes){
                    clockTimerType = 'frame';
                    clockTimer = window.requestAnimationFrame(function(){
                        clockTimer = null;
                        clockTimerType = null;
                        callback();
                    });
                    return;
                }

                clockTimerType = 'timeout';
                clockTimer = window.setTimeout(function(){
                    clockTimer = null;
                    clockTimerType = null;
                    callback();
                }, 1000);
            }

            function getCorrectedDate(){
                var theDate = new Date();

                if(el.timeCorrection){
                    if(el.timeCorrection.operator === '+'){
                        theDate.setHours(theDate.getHours() + el.timeCorrection.hours);
                        theDate.setMinutes(theDate.getMinutes() + el.timeCorrection.minutes);
                    }
                    if(el.timeCorrection.operator === '-'){
                        theDate.setHours(theDate.getHours() - el.timeCorrection.hours);
                        theDate.setMinutes(theDate.getMinutes() - el.timeCorrection.minutes);
                    }
                }

                return theDate;
            }

            function drawCurrentFrame(){
                var theDate = getCorrectedDate(),
                    ms,
                    seconds,
                    minutes,
                    minutesWithSeconds,
                    hours,
                    hoursWithMinutes;

                seconds = theDate.getSeconds();
                ms = el.sweepingSeconds ? theDate.getMilliseconds() : 0;
                minutes = theDate.getMinutes();
                minutesWithSeconds = minutes + (seconds / 60);
                hours = theDate.getHours();
                hoursWithMinutes = twelvebased(hours + (minutesWithSeconds / 60));

                ctx.clearRect(-radius,-radius,el.size,el.size);
                drawDial(el.dialColor, el.dialBackgroundColor);

                if(el.alarmTime !== undefined){
                    el.alarmTime = checkAlarmTime(el.alarmTime);
                    drawAlarmHand(el.alarmTime, el.alarmHandColor, el.alarmHandTipColor);
                }
                drawHourHand(hoursWithMinutes, el.hourHandColor);
                drawMinuteHand(minutesWithSeconds, el.minuteHandColor);
                drawSecondHand(ms, seconds, el.secondHandColor);

                return {
                    seconds: seconds,
                    minutes: minutes,
                    hours: hours
                };
            }

            function transitionNightMode(){
                var target = isNightMode() ? 1 : 0;

                updateNightModeProgress();
                nightModeTransitionFrom = nightModeProgress;
                nightModeTarget = target;

                if(nightModeTransitionFrom === nightModeTarget){
                    nightModeTransitionStart = null;
                    drawCurrentFrame();
                    return;
                }

                nightModeTransitionStart = getCurrentTime();
                drawCurrentFrame();
                scheduleNightModeTransitionFrame();
            }

            el.redraw = function(){
                drawCurrentFrame();
            };

            el.transitionNightMode = transitionNightMode;

            function startClock(x){
                if(destroyed || document.hidden){
                    clockLoopCount = x;
                    cancelScheduledTick();
                    return;
                }

                clockLoopCount = x;
                var frame = drawCurrentFrame(),
                    s = frame.seconds,
                    mins = frame.minutes,
                    hours = frame.hours,
                    allExtM,
                    allAlarmM;

                //trigger every second custom event
                if(y !== s){
                    $(el).trigger('onEverySecond');
                    y = s;
                }
               
                if(el.alarmTime !== undefined){
                    allExtM = (el.alarmTime.getHours()*60*60) + (el.alarmTime.getMinutes() *60) + el.alarmTime.getSeconds();
                }

                allAlarmM = (hours*60*60) + (mins*60) + s;

                //alarmMinutes greater than passed Minutes;
                if(allAlarmM >= allExtM){
                    x+=1; 
                }
                //trigger alarm for as many times as i < alarmCount
                if(x <= el.alarmCount && x !== 0){
                   $(el).trigger('onAlarm');
                }
                
                scheduleNextTick(function(){startClock(x)});

            }

            function handleVisibilityChange(){
                if(document.hidden){
                    cancelScheduledTick();
                } else if(clockTimer === null){
                    startClock(clockLoopCount);
                }
            }

            function destroyClock(){
                if(destroyed){
                    return;
                }

                destroyed = true;
                cancelScheduledTick();
                if(nightModeTransitionFrame !== null){
                    if(nightModeTransitionFrameType === 'frame'
                        && typeof window.cancelAnimationFrame === 'function'){
                        window.cancelAnimationFrame(nightModeTransitionFrame);
                    } else {
                        window.clearTimeout(nightModeTransitionFrame);
                    }
                    nightModeTransitionFrame = null;
                    nightModeTransitionFrameType = null;
                }
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                $(el).off('.thooClock');
                if(pragotronImg){
                    pragotronImg.onload = null;
                    pragotronImg.onerror = null;
                    pragotronImg = null;
                }
                el.replaceChildren();
                delete el.redraw;
                delete el.transitionNightMode;
                delete el.destroy;
            }

            $(el).on('onAlarm.thooClock', function(e){
                if(el.onAlarm !== undefined){
                    el.onAlarm();
                }
                e.preventDefault();
                e.stopPropagation();
            });

            $(el).on('onEverySecond.thooClock', function(e){
                if(el.onEverySecond !== undefined){
                    el.onEverySecond();
                }
                e.preventDefault();
            });

            $(el).on('offAlarm.thooClock', function(e){
                if(el.offAlarm !== undefined){
                    el.offAlarm();
                }
                e.stopPropagation();
                e.preventDefault();
            });

            el.destroy = destroyClock;
            document.addEventListener('visibilitychange', handleVisibilityChange);

            startClock(x);

   });//return each this;
  };     

}(jQuery));