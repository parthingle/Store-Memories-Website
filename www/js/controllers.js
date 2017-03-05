angular.module('app.controllers', [])

.controller('pageCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
    // You can include any angular dependencies as parameters for this function
    // TIP: Access Route Parameters for your page via $stateParams.parameterName
    function($scope, $stateParams) {


    }
])

.controller('heartRateCtrl', ['$scope', '$stateParams', '$cordovaHealthKit', '$cordovaSQLite', '$cordovaSms', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
    function($scope, $stateParams, $cordovaHealthKit, $cordovaSQLite, $cordovaSms) {
        // alert("heartRateCtrl");
        //$scope.heartbeat = 0;
        function getData() {
            db.transaction(function(tx) {
                var query = "SELECT * FROM HeartRateData order by timestamp desc limit 1;";

                tx.executeSql(query, [], function(tx, resultSet) {
                        console.log("heartRate:" + resultSet.rows.item(0).heartRate);

                        $scope.$apply(function() {
                            $scope.heartbeat = parseInt(resultSet.rows.item(0).heartRate);
                        });
                    },
                    function(tx, error) {
                        console.log('SELECT error: ' + error.message);
                    });
            }, function(error) {
                alert('transaction error: ' + error.message);
            }, function() {
                console.log('transaction ok');
            });
        }

        setInterval(getData, 3000);
    }
])

.controller('heartMonitorCtrl', ['$scope', '$stateParams', '$cordovaHealthKit', '$cordovaSQLite', '$cordovaSms', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
    // You can include any angular dependencies as parameters for this function
    // TIP: Access Route Parameters for your page via $stateParams.parameterName
    function($scope, $stateParams, $cordovaHealthKit, $cordovaSQLite, $cordovaSms) {
        $scope.Canvas = CanvasJS;
        $scope.dps = [];
        $scope.x = 1;
        $scope.divFactor = 1;

        function getData() {
            db.transaction(function(tx) {

                var query = "SELECT * FROM HeartRateData ORDER BY timestamp desc limit 1";

                tx.executeSql(query, [], function(tx, resultSet) {
                        var dps = [];
                        for (var x = resultSet.rows.length - 1; x >= 0; x--) {
                            console.log("Time stamp: " + resultSet.rows.item(x).timestamp + " :: Heart Rate " + resultSet.rows.item(x).heartRate);

                            dps.push({
                                x: $scope.x++,
                                y: resultSet.rows.item(x).heartRate / $scope.divFactor
                            });

                        }
                        if ($scope.dps.length >= 10) {
                            $scope.dps.shift();
                        }
                        $scope.dps.push(dps[0]);
                        console.log($scope.dps);
                    },
                    function(tx, error) {
                        console.log('SELECT error: ' + error.message);
                    });
            }, function(error) {
                console.log('transaction error: ' + error.message);
            }, function() {
                $scope.updateChart();
            });
        }

        $scope.click = function() {
            setInterval(getData, 2000);
        }


        //var dps = []; // dataPoints 
        $scope.chart = new CanvasJS.Chart("chartContainer", {
            axisY: {
                viewportMinimum: 30,
                viewportMaximum: 220
            },
            data: [{
                type: "line",
                dataPoints: $scope.dps
            }]
        });

        $scope.anamoly = function() {
            $scope.divFactor += 1;
        }
        $scope.stopAnamoly = function() {
            $scope.divFactor -= 1;
        }


        var dataLength = 50; // number of dataPoints visible at any point

        $scope.updateChart = function() {
            $scope.chart.render();
        };

        function getCurrentHeartState() {
            //$scope.insertData();
            var query = "Select * from HeartRateData order by timestamp DESC limit 1;";
            var output;
            var currentRate;
            db.transaction(function(tx) {

                tx.executeSql(query, [], function(tx, res) {
                    console.log(res.rows);
                    //alert("currentRate:" + JSON.stringify(res.rows.item(0)));
                    currentRate = res.rows.item(0);
                    // currentRate = {
                    //     timestamp: 142776756577989,
                    //     heartRate: Math.random() * 20,
                    //     fullDateString: 'jfhagj',
                    //     stepCount: 25,
                    //     isResting: 1
                    // }
                    currentState = getCurrentState(currentRate);
                }, function(err) {
                    console.error(err);
                });
            });
        }

        function getCurrentState(currentRate) {
            var currentState;
            var getCondition = "Select * from heartRangeData where start_age<=24 and end_age>=24 and is_rest=" + currentRate.isResting + " and max_heart_rate>=" + currentRate.heartRate + " and min_heart_rate<=" + currentRate.heartRate + ";";
            //alert(getCondition);
            db.transaction(function(tx) {

                tx.executeSql(getCondition, [], function(tx, data) {
                    console.log(data.rows);
                    //alert(JSON.stringify(tx));
                    //alert("currentState:" + JSON.stringify(data.rows.item(0)));
                    //if data ==null as in if the heart rate is beyond the max range
                    //then it needs special attention
                    if (data.rows == null || data.rows.length == 0) {
                        $scope.sendSms(currentRate.heartRate);
                        output = 'Need Attention';
                        document.getElementById("best").addClass("blur-class");
                        document.getElementById("healthy").addClass("blur-class");
                        document.getElementById("normal").addClass("blur-class");
                        document.getElementById("need-attention").removeClass("blur-class");
                    }
                    currentState = data.rows.item(0);
                    getAvgRest(currentRate, currentState);
                    //return currentState;
                }, function(err) {
                    alert("Some error occurred");
                });
            });
        }

        function getAvgRest(currentRate, currentState) {
            var averageRateRest;
            var avgCondition = "Select avg(heartRate) as avg from HeartRateData where isResting=1 ;";
            db.transaction(function(tx) {

                tx.executeSql(avgCondition, [], function(tx, data) {
                    console.log(data.rows);
                    //alert("avgCondition:" + JSON.stringify(data.rows.item(0)));
                    averageRateRest = data.rows.item(0).avg;
                    getAvgWork(currentRate, averageRateRest, currentState);
                    //return averageRateRest;
                }, function(err) {
                    alert("Some error occurred");
                });
            });

        }

        function getAvgWork(currentRate, averageRateRest, currentState) {
            var averageRateWork;
            avgCondition = "Select avg(heartRate) as avg from HeartRateData where isResting=0 ;";
            db.transaction(function(tx) {

                tx.executeSql(avgCondition, [], function(tx, data) {
                    console.log(data.rows);
                    //alert("avgCondition work:" + JSON.stringify(data.rows.item(0)));
                    averageRateWork = data.rows.item(0).avg;

                    if (currentRate.isResting == 0) {
                        //now he is working out so if the the heart rate goes below the average of rest then it is outlier HeartRate
                        //which suggests there is some medical problem with the person working out
                        //as his heart is not even pumping as it used to pump during rest
                        if (averageRateRest != undefined && currentRate.heartRate < averageRateRest) {
                            //write function for calling Sending SMS
                            $scope.sendSms(currentRate.heartRate);
                            output = 'Need Attention';
                            document.getElementById("best").addClass("blur-class");
                            document.getElementById("healthy").addClass("blur-class");
                            document.getElementById("normal").addClass("blur-class");
                            document.getElementById("need-attention").removeClass("blur-class");

                        } else if (currentState.state_no < 4) {
                            output = 'Good - Healthy';
                            document.getElementById("best").addClass("blur-class");
                            document.getElementById("healthy").removeClass("blur-class");
                            document.getElementById("normal").addClass("blur-class");
                            document.getElementById("need-attention").addClass("blur-class");
                        } else if (currentState.state_no < 6) {
                            output = 'Normal';
                            document.getElementById("best").addClass("blur-class");
                            document.getElementById("healthy").addClass("blur-class");
                            document.getElementById("normal").removeClass("blur-class");
                            document.getElementById("need-attention").addClass("blur-class");
                        } else {
                            output = 'Below - Normal';
                            document.getElementById("best").addClass("blur-class");
                            document.getElementById("healthy").addClass("blur-class");
                            document.getElementById("normal").removeClass("blur-class");
                            document.getElementById("need-attention").addClass("blur-class");
                        }
                    }

                    if (currentRate.isResting == 1) {
                        //now he is resting so if the the heart rate goes above the average of workout then it is outlier HeartRate
                        //which suggests there is some medical problem with the person working out
                        //as his heart is not even pumping as it used to pump during rest
                        if (averageRateWork != undefined && currentRate.heartRate > averageRateWork) {
                            //write function for calling Sending SMS
                            $scope.sendSms(currentRate.heartRate);
                            output = 'Need Attention';
                            document.getElementById("best").className = "blur-class";
                            document.getElementById("healthy").className = "blur-class";
                            document.getElementById("normal").className = "blur-class";
                            document.getElementById("need-attention").className = "";
                        } else if (currentState.state_no < 4) {
                            output = 'Good - Healthy';
                            document.getElementById("best").className = "";
                            document.getElementById("healthy").className = "blur-class";
                            document.getElementById("normal").className = "blur-class";
                            document.getElementById("need-attention").className = "blur-class";
                        } else if (currentState.state_no < 6) {
                            output = 'Normal';
                            document.getElementById("best").className = "blur-class";
                            document.getElementById("healthy").className = "";
                            document.getElementById("normal").className = "blur-class";
                            document.getElementById("need-attention").className = "blur-class";
                        } else {
                            output = 'Below - Normal';
                            document.getElementById("best").className = "blur-class";
                            document.getElementById("healthy").className = "blur-class";
                            document.getElementById("normal").className = "";
                            document.getElementById("need-attention").className = "blur-class";
                        }
                    }
                    //alert(output);
                    //return averageRateWork;
                }, function(err) {
                    alert("Some error occurred");
                });
            });
        }

        $scope.sendSms = function(heartRate) {
            var options = {
                replaceLineBreaks: false, // true to replace \n by a new line, false by default
                android: {
                    intent: 'INTENT' // send SMS with the native android SMS messaging
                        //intent: '' // send SMS without open any other app
                }
            };
            alert("in sms");
            var smsContent = user + ' may have some health issue as its pulse rate currently is ' + heartRate + ' which needs attention. Please get in touch as soon as possible.\n Regards Heartistic';
            $cordovaSms
                .send(contacts[0].contact, smsContent, options)
                .then(function() {
                    // Success! SMS was sent
                    alert('SMS to ' + contacts[0].name + ' sent successfully.');
                }, function(error) {
                    // An error occurred
                    alert('Unfortunately we could not send SMS to ' + name1);
                });


            $cordovaSms
                .send(contacts[1].contact, smsContent, options)
                .then(function() {
                    // Success! SMS was sent
                    alert('SMS to ' + contacts[1].name + ' sent successfully.');
                }, function(error) {
                    // An error occurred
                    alert('Unfortunately we could not send SMS to ' + contacts[1].name);
                });
        }


        setInterval(getCurrentHeartState, 2000);
        setTimeout($scope.click, 500);
    }
])

.controller('healthTipsCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
    // You can include any angular dependencies as parameters for this function
    // TIP: Access Route Parameters for your page via $stateParams.parameterName
    function($scope, $stateParams) {


    }
])

.controller('emergencyContactCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
    // You can include any angular dependencies as parameters for this function
    // TIP: Access Route Parameters for your page via $stateParams.parameterName
    function($scope, $stateParams) {
        console.log(contacts);
        $scope.items = contacts;;
        $scope.addContact = function() {
            con = {
                name: document.getElementById("name2").value,
                contact: document.getElementById("contact2").value
            }
            contacts.push(con);
            $scope.items = contacts;
            console.log("name and contact:" + JSON.stringify(contacts));
            document.getElementById("name2").value = '';
            document.getElementById("contact2").value = '';

        }

    }
])