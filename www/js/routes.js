angular.module('app.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
    
  

      .state('page', {
    url: '/page1',
    templateUrl: 'templates/page.html',
    controller: 'pageCtrl'
  })

  .state('heartRate', {
    url: '/page3',
    templateUrl: 'templates/heartRate.html',
    controller: 'heartRateCtrl'
  })

  .state('heartMonitor', {
    url: '/page4',
    templateUrl: 'templates/heartMonitor.html',
    controller: 'heartMonitorCtrl'
  })

  .state('healthTips', {
    url: '/page5',
    templateUrl: 'templates/healthTips.html',
    controller: 'healthTipsCtrl'
  })

  .state('emergencyContact', {
    url: '/page7',
    templateUrl: 'templates/emergencyContact.html',
    controller: 'emergencyContactCtrl'
  })

$urlRouterProvider.otherwise('/page1')

  

});