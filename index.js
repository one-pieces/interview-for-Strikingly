var score = 0;
var count = 0;
var NUMBER_OF_WORDS_TO_GUESS = 80;
var wordArray = [];
var wordsMatchLength;
var lettersGuessed;

function createXmlHttpRequest() {
    if (window.ActiveXObject) { // 如果是IE
        return new ActiveXObject("Microsoft.XMLHTTP");
    } else if (window.XMLHttpRequest) { // 非IE
        return new XMLHttpRequest();
    }
}

function generatePattern(word) {
    var patternStr = '';
    var starNum = 0;
    for (var i = 0, len = word.length; i < len; i++) {
        if (word[i] == '*') {
            starNum = starNum + 1;
        } else {
            patternStr = patternStr + (starNum ? '\\w{' + starNum + '}' : '') + word[i];
            starNum = 0;
        }
    }
    // 修正结尾的星号
    patternStr = patternStr + (starNum ? '\\w{' + starNum + '}' : '');
    return new RegExp(patternStr, 'i');
}

function handleFileSelect() {
    var files = document.getElementById('files').files;
    if (!files.length) {
      alert('Please select a file!');
      return;
    }

    var file = files[0];

    var reader = new FileReader();

    // If we use onloadend, we need to check the readyState.
    reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) { // DONE == 2
            // document.getElementById('byte_content').textContent = evt.target.result;
            var content = evt.target.result;
            wordArray = content.split('\r\n');
            for (var i = 0; i < wordArray.length; i++) {
                wordArray[i] = wordArray[i].split(' ')[0];
            };
        }
    };
    reader.readAsBinaryString(file);
}

function postRequest(params) {
    var deferred = new Deferred();
    var url = "https://strikingly-hangman.herokuapp.com/game/on ";
    // 1.创建XMLHttpRequest组件
    var xmlHttpRequest = createXmlHttpRequest();
    // 2.设置回调函数
    xmlHttpRequest.onreadystatechange = (function(xmlHttpRequest) {
        return function() {
            if (xmlHttpRequest.readyState == 4 && xmlHttpRequest.status == 200) {
                var response = JSON.parse(xmlHttpRequest.responseText);
                deferred.resolve(response);
            }
        }
    }(xmlHttpRequest));
    // 3.初始化XMLHttpRequest组件
    xmlHttpRequest.open("POST", url, true);
    // 4.设置请求头
    xmlHttpRequest.setRequestHeader("Accept", "application/json, */*");
    xmlHttpRequest.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    // 5.发送请求
    xmlHttpRequest.send(JSON.stringify(params));

    return deferred.promise;
}

function startGame(playerId) {
    var deferred = new Deferred();
    postRequest({
        "playerId": playerId,
        "action": "startGame"
    }).then(function(response) {
        deferred.resolve(response);
    });
    return deferred.promise;
}

function giveMeAWord(sessionId) {
    var deferred = new Deferred();
    postRequest({
        "sessionId": sessionId,
        "action": "nextWord"
    }).then(function(response) {
        deferred.resolve(response);
    });
    return deferred.promise;
}

function makeAGuess(sessionId, guess) {
    var deferred = new Deferred();
    postRequest({
        "sessionId": sessionId,
        "action": "guessWord",
        "guess": guess
    }).then(function(response) {
        deferred.resolve(response);
    });
    return deferred.promise;
}

function getMyResult(sessionId) {
    var deferred = new Deferred();
    postRequest({
        "sessionId": sessionId,
        "action": "getResult"
    }).then(function(response) {
        deferred.resolve(response);
    });
    return deferred.promise;
}

function submitMyResult(sessionId) {
    var deferred = new Deferred();
    postRequest({
        "sessionId": sessionId,
        "action": "submitResult"
    }).then(function(response) {
        deferred.resolve(response);
    });
    return deferred.promise;
}

function guessAWord(response, index, letter, cb) {
    // var alphabet = [ 'E', 'T', 'A', 'O', 'I', 'N', 'R', 'S',
    //     'H', 'D', 'C', 'L', 'M', 'P', 'U', 'F', 'G', 'W', 'Y',
    //     'B', 'V', 'K', 'X', 'J', 'Q', 'Z' ];
    var numberOfLetters = response.data.word.length;
    var lastStarCount = (response.data.word.split('*')).length - 1;
    makeAGuess(response.sessionId, letter).then(function(response) {
        starCount = (response.data.word.split('*')).length - 1;
        if (response.data.wrongGuessCountOfCurrentWord < 10) {
            if (starCount) {
                if (starCount < lastStarCount) {
                    // 答对
                    for (var i = 0, len = wordsMatchLength.length; i < len; i++) {
                        if (wordsMatchLength[i] && !generatePattern(response.data.word).test(wordsMatchLength[i])) {
                            wordsMatchLength.splice(i, 1);
                            i--;
                            len--;
                        }
                    }
                    guessAWord(response, index + 1, filter(numberOfLetters), cb);
                } else {
                    // 答错
                    for (var i = 0, len = wordsMatchLength.length; i < len; i++) {
                        if (wordsMatchLength[i] &&
                                (wordsMatchLength[i].indexOf(letter.toLowerCase()) > -1 || wordsMatchLength[i].indexOf(letter.toUpperCase()) > -1)) {
                            wordsMatchLength.splice(i, 1);
                            i--;
                            len--;
                        }
                    }
                    guessAWord(response, index + 1, filter(numberOfLetters), cb);
                }
            } else {
                var temp = index + 1;
                console.log("答题正确，正确答案为 " + response.data.word
                    + "，猜词次数为 " + temp
                    + "，猜错次数为 " + response.data.wrongGuessCountOfCurrentWord);
                cb(true);
            }
        } else {
            var temp = index + 1;
            console.log("答题错误，当前答题情况为 " + response.data.word
                + "，猜词次数为 " + temp + "，超过最大能猜错次数10");
            cb(false);
        }
    });
}

function filter(numberOfLetters) {
    var l;
    var frequency = 0;
    var letterFrequency = [];
    if (!wordsMatchLength.length) {
        for (var i = 0, len = wordArray.length; i < len; i++) {
            if (wordArray[i].length === numberOfLetters) {
                wordsMatchLength.push(wordArray[i]);
            }
        }
    }
    for (var i = 0, len = wordsMatchLength.length; i < len; i++) {
        for (var j = 0, innerLen = wordsMatchLength[i].length; j < innerLen; j++) {
            letterFrequency[wordsMatchLength[i][j].toLowerCase()] == undefined
                    ? letterFrequency[wordsMatchLength[i][j].toLowerCase()] = 1
                    : letterFrequency[wordsMatchLength[i][j].toLowerCase()]++;
        }
    }
    for (var key in letterFrequency) {
        if (letterFrequency[key] > frequency && lettersGuessed.indexOf(key) < 0) {
            frequency = letterFrequency[key];
            l = key;
        }
    }
    lettersGuessed.push(l);
    return l.toUpperCase();
}

function playGame(sessionId, cb) {
    giveMeAWord(sessionId).then(function(response) {
        wordsMatchLength = [];
        lettersGuessed = [];
        var numberOfLetters = response.data.word.length;
        console.log("   第" + (count+1) + "题正在答题。。。字母数为 " + numberOfLetters);
        // filter(numberOfLetters)
        guessAWord(response, 0, filter(numberOfLetters), function(result) {
            if (result) {
                score++;
            }
            if (++count < NUMBER_OF_WORDS_TO_GUESS) {
                playGame(response.sessionId, cb);
            } else {
                cb(score);
            }
        });
    });
}

function gameRunner(account) {
    console.log("游戏启动中！！！共有" + NUMBER_OF_WORDS_TO_GUESS + "题");
    startGame(account).then(function(response) {
        console.log("游戏开始！！！");
        playGame(response.sessionId, function(score) {
            console.log("最后分数为 " + score);
            getMyResult(response.sessionId).then((response) => {
                console.log(response.data.score);
                if (document.getElementById('submit').checked) {
                    submitMyResult(response.sessionId).then((response) => {
                        console.log(response);
                    });
                }
            });
        });
    });
}
window.onload = function() {
    document.getElementById('files').addEventListener('change', handleFileSelect, false);
};