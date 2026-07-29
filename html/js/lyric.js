/**************************************************
 * MKOnlinePlayer v2.31
 * 歌词解析及滚动模块
 * 编写：mengkun(http://mkblog.cn)
 * 时间：2017-9-13
 * 修改：@xsran2008
 * 时间：2025-7-28
 *************************************************/
 
var lyricArea = $("#lyric");    // 歌词显示容器

// 在歌词区显示提示语（如歌词加载中、无歌词等）
function lyricTip(str) {
    lyricArea.html("<li class='lyric-tip'>"+str+"</li>");     // 显示内容
}

// 歌曲加载完后的回调函数
// 参数：歌词源文件
function lyricCallback(str, id, tstr) {
    if(id !== musicList[rem.playlist].item[rem.playid].id) return;  // 返回的歌词不是当前这首歌的，跳过
    
    if (str === "") {
        lyricTip('暂时没有歌词');
        return false;
    }
    rem.lyric = parseLyric(str); // 解析获取到的歌词
    rem.tlyric = parseLyric(tstr);
    
    // 缓存排序后的 key 列表（浮点数 key 在 for...in 中不保证数值顺序）
    rem.sortedLyricKeys = Object.keys(rem.lyric).sort(function(a, b) {
        return parseFloat(a) - parseFloat(b);
    });
    
    lyricArea.html('');     // 清空歌词区域的内容
    lyricArea.scrollTop(0);    // 滚动到顶部
    
    rem.lastLyric = -1;
    
    // 显示全部歌词
    var i = 0;
    for(var idx = 0; idx < rem.sortedLyricKeys.length; idx++) {
        var k = rem.sortedLyricKeys[idx];
        var txt = rem.lyric[k];
        if(!txt) txt = "&nbsp;";
        
        if (!rem.tlyric || rem.tlyric === '' || rem.tlyric[k] === undefined) {
		    var li = $("<li data-no='" + i + "' class='lrc-item'><span class='shell'>" + txt + "</span></li>");
        } else { 
            var txtTranslate = rem.tlyric[k];
            if(!txtTranslate || txtTranslate === '') txtTranslate = "&nbsp;";
            var li = $("<li data-no='" + i + "' class='lrc-item'><span class='shell'>" + txt + "</span><br /><span class='trans-lyric-item'>" + txtTranslate + "</span></li>");
        }
        lyricArea.append(li);
        i++;
    }
}

// 强制刷新当前时间点的歌词
// 参数：当前播放时间（单位：秒）
function refreshLyric(time) {
    if(rem.lyric === '') return false;
    if(rem.lyric === undefined) return false;
    if(!rem.sortedLyricKeys || rem.sortedLyricKeys.length === 0) return false;
    
    // 找不超过 time 的最近 key
    var targetKey = null;
    var sortedKeys = rem.sortedLyricKeys;
    for(var idx = 0; idx < sortedKeys.length; idx++) {
        var key = parseFloat(sortedKeys[idx]);
        if(key <= time) {
            targetKey = key;
        } else {
            break;
        }
    }
    if(targetKey === null) return false;
    scrollLyric(targetKey);
}

// 滚动歌词到指定句
// 参数：当前播放时间（单位：秒）
function scrollLyric(time) {
    if(rem.lyric === '') return false;
    if(rem.lyric === undefined) return false;
    if(!rem.sortedLyricKeys || rem.sortedLyricKeys.length === 0) return false;
    
    var sortedKeys = rem.sortedLyricKeys;
    
    // 找不超过 time 的最近 key（time 可能是浮点数，如 15.992）
    var targetKey = null;
    for(var idx = 0; idx < sortedKeys.length; idx++) {
        var key = parseFloat(sortedKeys[idx]);
        if(key <= time) {
            targetKey = key;
        } else {
            break;
        }
    }
    if(targetKey === null) return false;  // 当前时间之前没有歌词
    if(rem.lastLyric == targetKey) return true;  // 歌词没发生改变
    
    var i = 0;  // 获取当前歌词是在第几行
    for(var idx = 0; idx < sortedKeys.length; idx++) {
        if(parseFloat(sortedKeys[idx]) == targetKey) break;
        i ++;
    }
    var j = 0; // 获取当前翻译歌词是在第几行
    if (rem.tlyric){
        for(var idx = 0; idx < sortedKeys.length; idx++) {
            if(parseFloat(sortedKeys[idx]) >= targetKey) break;
            if(rem.tlyric[sortedKeys[idx]] !== undefined) j ++;
        }
    }
    
    rem.lastLyric = targetKey;  // 记录方便下次使用
    $(".lplaying").removeClass("lplaying");     // 移除其余句子的正在播放样式
    $(".lrc-item[data-no='" + i + "']").addClass("lplaying");    // 加上正在播放样式
    var scroll = (parseInt($(".lyric").css('line-height')) * (i + j)) - ($(".lyric").height() / 2); 
    // var scroll = (28 * (i + j)) - ($(".lyric").height() / 2); 
    // console.log("scroll\t"+scroll+"\nlyric\t"+i+"\ntlyric\t"+j);
    lyricArea.stop().animate({scrollTop: scroll}, 500);  // 平滑滚动到当前歌词位置(更改这个数值可以改变歌词滚动速度，单位：毫秒)
    
}

// 解析歌词
// 这一函数来自 https://github.com/TivonJJ/html5-music-player
// 参数：原始歌词文件
function parseLyric(lrc) {
    if(lrc === '') return '';
    var lyrics = lrc.split("\n");
    var lrcObj = {};
    for(var i=0;i<lyrics.length;i++){
        var lyric = decodeURIComponent(lyrics[i]);
        var timeReg = /\[\d*:\d*((\.|\:)\d*)*\]/g;
        var timeRegExpArr = lyric.match(timeReg);
        if(!timeRegExpArr)continue;
        var clause = lyric.replace(timeReg,'');
        for(var k = 0,h = timeRegExpArr.length;k < h;k++) {
            var t = timeRegExpArr[k];
            var parts = t.match(/\[(\d+):(\d+(?:\.\d+)?)\]/);
            if (!parts) continue;
            var min = parseInt(parts[1]);
            var sec = parseFloat(parts[2]);
            var time = min * 60 + sec;
            lrcObj[time] = clause;
        }
    }
    return lrcObj;
}