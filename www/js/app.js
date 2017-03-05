// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
var db = null;
var contacts = [];
var con = {
    name: 'Abhishek Nigam',
    contact: '3528881397'
}
contacts.push(con);
var user = 'Keyur';

angular.module('app', ['ionic', 'ngCordova', 'app.controllers', 'app.routes', 'app.directives', 'app.services', ])

.config(function($ionicConfigProvider, $sceDelegateProvider) {


    $sceDelegateProvider.resourceUrlWhitelist(['self', '*://www.youtube.com/**', '*://player.vimeo.com/video/**']);

})

.run(function($ionicPlatform, $cordovaHealthKit, $cordovaSQLite, $cordovaSms) {
    $ionicPlatform.ready(function() {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            cordova.plugins.Keyboard.disableScroll(true);
        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleDefault();
        }

        $cordovaHealthKit.isAvailable().then(function(yes) {
            // HK is available
            //alert("in check for permission");
            var permissions = ['HKQuantityTypeIdentifierHeight', 'HKQuantityTypeIdentifierHeartRate', 'HKQuantityTypeIdentifierStepCount'];

            $cordovaHealthKit.requestAuthorization(
                permissions, // Read permission
                permissions // Write permission
            ).then(function(success) {
                // store that you have permissions
                //alert("success in permission");
            }, function(err) {
                // handle error
                alert("error in permissions:" + err);
            });

        }, function(no) {
            // No HK available
            alert("No HK available");
        });

        var filename;
        if (window.cordova) {
            db = $cordovaSQLite.openDB({ name: 'my.db', location: 'default' }); //device
            filename = "heart_data.json";
        } else {
            db = window.openDatabase('my.db', '1', 'my', 1024 * 1024 * 100); // browser
            console.log("browser");
            filename = "../heart_data.json";
        }

        //db schema creation
        db.transaction(function(tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS HeartRateData (timestamp, fullDateString, heartRate, stepCount, isResting)');

        }, function(error) {
            console.log('Cannot creatr table ERROR: ' + error.message);
        }, function() {
            console.log('created table OK');
        });
        db.transaction(function(tx) {
                tx.executeSql('Delete from table heartRangeData');
            }, function(error) {
                console.log(error);
            },
            function() {
                console.log();
            });
        db.transaction(function(tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS heartRangeData (id integer, start_age integer, end_age integer, is_rest integer, max_heart_rate integer, min_heart_rate integer, state_no integer)');
        }, function(error) {
            console.log('Cannot creatr table ERROR: ' + error.message);
        }, function(a) {
            console.log('created table OK');
        });
        db.transaction(function(tx) {
            var request = new XMLHttpRequest();


            request.open("GET", filename, false);
            request.send(null);
            //$http.get("../heart_data.json").success(function (res) {
            var data = JSON.parse(request.responseText).Sheet1;

            for (var i = 0; i < data.length; i++) {
                tx.executeSql('INSERT INTO heartRangeData(id, start_age, end_age, is_rest, max_heart_rate, min_heart_rate, state_no) VALUES (?,?,?,?,?,?,?)', [data[i].id, data[i].start_age, data[i].end_age, data[i].is_rest, data[i].max_heart_rate, data[i].min_heart_rate, data[i].state_no]);
            }
            //});
        }, function(error) {
            alert('Cannot insert into heartRangeData ERROR: ' + error.message);
        }, function() {
            console.log('inserted into table OK');
        });

        //for starting streaming of heart and streaming of steps
        function streamHeart() {
            var startDate;
            if (localStorage.getItem("startDate") == null || localStorage.getItem("startDate") == undefined) {
                startDate = 2 * 24 * 60 * 60 * 1000;
                localStorage.setItem("startDate", startDate);
            } else {
                startDate = localStorage.getItem("startDate");
                localStorage.setItem("startDate", new Date().getTime());

            }

            window.plugins.healthkit.querySampleType({
                    'startDate': new Date(new Date().getTime() - startDate), // two days ago
                    'endDate': new Date(), // now
                    'sampleType': 'HKQuantityTypeIdentifierHeartRate',
                    'unit': 'count/min' // make sure this is compatible with the sampleType
                },
                onSuccessHeartRate,
                onErrorHeartRate
            );
        }

        function onSuccessHeartRate(v) {

            var len = v.length;
            var hData = parseHeartData(v);
            addHeartData(hData);
        }

        function onErrorHeartRate(v) {
            alert(v);
        }

        function formatDateTime(date) {
            var c = new Date(date);
            c.setSeconds(0);
            return c;
        }

        function addHeartData(x) {
            for (var i = 0; i < x.length; i++) {
                var obj = x[i];
                InsertHeartData(obj.timeStamp, obj.fullDate, obj.heartRate, 0, 1);
            }
            //getData();
        }

        function InsertHeartData(timestamp, fullDate, heartRate, stepCount, isResting) {
            db.transaction(function(tx) {

                tx.executeSql('SELECT count(*) AS mycount FROM HeartRateData WHERE timestamp=' + timestamp, [], function(tx, rs) {
                    //console.log('Record count (expected to be 2): ' + rs.rows.item(0).mycount);
                    if (rs.rows.item(0).mycount == 0) {
                        tx.executeSql('INSERT INTO HeartRateData VALUES (?,?,?,?,?)', [timestamp, fullDate, heartRate, stepCount, isResting]);
                    } else {
                        console.log('already exists');
                        var query = "UPDATE HeartRateData SET heartRate = ? WHERE timestamp = ?";

                        tx.executeSql(query, [heartRate + 1, timestamp],
                            function(tx, res) {
                                //console.log("insertId: " + res.insertId);
                                //c/onsole.log("rowsAffected: " + res.rowsAffected);
                            },
                            function(tx, error) {
                                //console.log('UPDATE error: ' + error.message);
                            });
                    }
                }, function(tx, error) {
                    console.log('SELECT error: ' + error.message);
                });




            }, function(error) {
                console.log('Transaction ERROR: ' + error.message);
            }, function() {
                console.log('Populated database OK');
            });
        }

        function parseHeartData(arrHeartData) {
            var len = arrHeartData.length;
            var relevantData = [];

            for (var i = 0; i < len; i++) {
                var tmp = arrHeartData[i];
                timeStamp = formatDateTime(tmp.startDate);
                var obj = {
                    timeStamp: timeStamp.getTime(),
                    fullDate: timeStamp.toString(),
                    heartRate: tmp.quantity,
                    sampleCount: 1
                }
                relevantData.push(obj);
            }
            //alert('parse heartdata');
            return normalizeHeartRate(relevantData);
        }

        function normalizeHeartRate(data) {
            var len = data.length;
            var obj = {};
            var tmp;
            var stamp;
            for (var i = 0; i < len; i++) {
                tmp = data[i];
                stamp = tmp.timeStamp;
                if (obj[stamp] == null) {
                    obj[stamp] = tmp;
                } else {
                    var count = obj[stamp].sampleCount;
                    var hRate = (count * obj[stamp].heartRate + tmp.heartRate) / (count + 1);
                    obj[stamp].heartRate = hRate;
                    obj[stamp].sampleCount = count + 1;
                }
            }
            var normalizedData = [];
            for (var key in obj) {
                normalizedData.push(obj[key]);
            }
            //alert('parse normalizedData');
            return normalizedData;
        }

        //-------------------------------end stream heart data----------------------------------------------------------//

        //------------------------------stream steps data---------------------------------------------------------------//
        function streamStepsData() {
            var startDate;

            if (localStorage.getItem("stepsStartDate") == null || localStorage.getItem("stepsStartDate") == undefined) {
                startDate = 2 * 60 * 60 * 1000;
                localStorage.setItem("stepsStartDate", startDate);
            } else {
                startDate = localStorage.getItem("stepsStartDate");
                localStorage.setItem("stepsStartDate", new Date().getTime());

            }

            window.plugins.healthkit.querySampleType({
                    'startDate': new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000), // two days ago
                    'endDate': new Date(), // now
                    'sampleType': 'HKQuantityTypeIdentifierStepCount',
                    'unit': 'count' // make sure this is compatible with the sampleType
                },
                onSuccessStepCount,
                onErrorStepCount
            );
        }


        function addStepsData(x) {
            for (var i = 0; i < x.length; i++) {
                var obj = x[i];
                var isResting;
                if (obj.stepCount > 25) {
                    isResting = 0;
                } else {
                    isResting = 1;
                }
                InsertStepsData(obj.timeStamp, obj.fullDate, obj.stepCount, isResting);
            }

        }

        function onSuccessStepCount(v) {
            var len = v.length;
            // $scope.stepsData = v;

            //var stepsDiv = document.getElementById("steps");
            // alert(JSON.stringify($scope.stepsData));
            //stepsDiv.innerHTML = JSON.stringify($scope.stepsData);
            parseStepsData(v);
        }

        function onErrorStepCount(v) {
            alert(v);
        }

        function InsertStepsData(timestamp, fullDate, stepCount, isResting) {
            db.transaction(function(tx) {

                tx.executeSql('SELECT count(*) AS mycount FROM HeartRateData WHERE timestamp=' + timestamp, [], function(tx, rs) {

                    if (rs.rows.item(0).mycount == 0) {
                        tx.executeSql('INSERT INTO HeartRateData VALUES (?,?,?,?,?)', [timestamp, fullDate, 0, stepCount, isResting]);
                    } else {
                        console.log('already exists');
                        var query = "UPDATE HeartRateData SET stepCount = ?, isResting = ? WHERE timestamp = ?";

                        tx.executeSql(query, [stepCount, isResting, timestamp],
                            function(tx, res) {
                                //console.log("insertId: " + res.insertId);
                                //c/onsole.log("rowsAffected: " + res.rowsAffected);
                            },
                            function(tx, error) {
                                //console.log('UPDATE error: ' + error.message);
                            });
                    }
                }, function(tx, error) {
                    console.log('SELECT error: ' + error.message);
                });




            }, function(error) {
                console.log('Transaction ERROR: ' + error.message);
            }, function() {
                console.log('Populated database OK');
            });
        }

        function parseStepsData(arrStepsData) {
            var len = arrStepsData.length;
            var relevantData = [];
            var avgSteps = 0;
            for (var i = 0; i < len; i++) {
                var tmp = arrStepsData[i];
                timeStamp = formatStepDateTime(tmp.startDate, tmp.endDate);
                avgSteps = tmp.quantity / timeStamp.length;
                for (var j = 0; j < timeStamp.length; j++) {
                    var obj = {
                        timeStamp: timeStamp[j].getTime(),
                        fullDate: timeStamp[j].toString(),
                        stepCount: avgSteps,
                        sampleCount: 1
                    }
                    relevantData.push(obj);
                }
            }
            return normalizeStepsdata(relevantData);
        }

        function normalizeStepsdata(data) {
            var len = data.length;
            var obj = {};
            var tmp;
            var stamp;
            for (var i = 0; i < len; i++) {
                tmp = data[i];
                stamp = tmp.timeStamp;
                if (obj[stamp] == null) {
                    obj[stamp] = tmp;
                } else {

                    obj[stamp].stepCount = obj[stamp].stepCount + tmp.stepCount;

                }
            }
            var normalizedData = [];
            for (var key in obj) {
                normalizedData.push(obj[key]);
            }
            return normalizedData;
        }

        function formatStepsDateTime(startDate, endDate) {
            var sd = new Date(startDate);
            var ed = new Date(endDate);
            sd.setSeconds(0);
            ed.setMinutes(ed.setMinutes() + 1);
            ed.setSeconds(0);
            var noOfMins = (ed.getTime() - sd.getTime()) / 60;
            var timestamps = [];

            for (var i = 0; i < noOfMins; i++) {
                timestamps.push(sd);
                sd = new Date(sd.setMinutes(sd.getMinutes() + 1));
            }

            return timestamps;
            //return c.getFullYear() + "-" + c.getMonth() + "-" + c.getDate() + "T" + c.getHours() + ":" + c.getMinutes() + ":0";

        }

        //---------------------temporary-------------------------------------------------//

        /* function insertData() {
             var json = JSON.parse('[{"quantity":57,"endDate":"2017-02-18T12:00:02-05:00","startDate":"2017-02-18T12:00:02-05:00","UUID":"70C2BA2A-BCB7-4176-B64E-841741A7B670","sourceBundleld":"com.apple.health. 6AF1A533-9B21-44E0- A11D-8B330AF86FC8","sourceName":"Abhishek Apple Watch","metadata":{}},{"quantity":72,"endDate":"2017-02-18T12:00:09-05:00","startDate":"2017-02-18T12:00:09-05:00","UUID":"70C2BA2A-BCB7-4176-B64E-841741A7B670","sourceBundleld":"com.apple.health. 6AF1A533-9B21-44E0- A11D-8B330AF86FC8","sourceName":"Abhishek Apple Watch","metadata":{}},{"quantity":57,"endDate":"2017-02-18T12:00:055-05:00","startDate":"2017-02-18T12:00:55-05:00","UUID":"70C2BA2A-BCB7-4176-B64E-841741A7B670","sourceBundleld":"com.apple.health. 6AF1A533-9B21-44E0- A11D-8B330AF86FC8","sourceName":"Abhishek Apple Watch","metadata":{}},{"quantity":57,"endDate":"2017-02-18T12:01:22-05:00","startDate":"2017-02-18T12:02:22-05:00","UUID":"70C2BA2A -BCB7-4176-B64E-841741A7B670","sourceBundleld":"com.apple.health. 6AF1A533-9B21-44E0- A11D-8B330AF86FC8","sourceName":"Abhishek Apple Watch","metadata":{}}]');
             var x = parseHeartData(json);
             addHeartData(x);
             console.log("here");
             alert("inserted temp data");
         }*/

        //insertData();
        //------------------------end temporary------------------------------------------//
        //-----------------------------end stream steps data------------------------------------------------------------//
        //to start straming heart rate
        //alert("before stram Heart");
        setInterval(streamHeart, 2000);
        //to start streaming step count
        setInterval(streamStepsData, 2000);
        //--------------------------- end code from iWatch project ------------------------------------------------------//


        function printDB() {
            db.transaction(function(tx) {

                var query = "SELECT * FROM HeartRateData";

                tx.executeSql(query, [], function(tx, resultSet) {
                        var str = "";
                        for (var x = 0; x < resultSet.rows.length; x++) {
                            //console.log("Time stamp: " + resultSet.rows.item(x).timestamp + " :: Heart Rate " + resultSet.rows.item(x).heartRate);
                            str += JSON.stringify(resultSet.rows.item(x));
                        }
                        alert("database" + str);
                    },
                    function(tx, error) {
                        console.log('SELECT error: ' + error.message);
                    });
            }, function(error) {
                console.log('transaction error: ' + error.message);
            }, function() {
                console.log('transaction ok');
            });
        }

        // setTimeout(printDB, 5000);
    });
})

/*
  This directive is used to disable the "drag to open" functionality of the Side-Menu
  when you are dragging a Slider component.
*/
.directive('disableSideMenuDrag', ['$ionicSideMenuDelegate', '$rootScope', function($ionicSideMenuDelegate, $rootScope) {
    return {
        restrict: "A",
        controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {

            function stopDrag() {
                $ionicSideMenuDelegate.canDragContent(false);
            }

            function allowDrag() {
                $ionicSideMenuDelegate.canDragContent(true);
            }

            $rootScope.$on('$ionicSlides.slideChangeEnd', allowDrag);
            $element.on('touchstart', stopDrag);
            $element.on('touchend', allowDrag);
            $element.on('mousedown', stopDrag);
            $element.on('mouseup', allowDrag);

        }]
    };
}])

/*
  This directive is used to open regular and dynamic href links inside of inappbrowser.
*/
.directive('hrefInappbrowser', function() {
    return {
        restrict: 'A',
        replace: false,
        transclude: false,
        link: function(scope, element, attrs) {
            var href = attrs['hrefInappbrowser'];

            attrs.$observe('hrefInappbrowser', function(val) {
                href = val;
            });

            element.bind('click', function(event) {

                window.open(href, '_system', 'location=yes');

                event.preventDefault();
                event.stopPropagation();

            });
        }
    };
});