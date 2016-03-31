'use strict';

angular.module('openhimConsoleApp')
  .controller('ClientsCtrl', function ($rootScope, $scope, $modal, $interval, Api, Alerting, Notify) {


    /* -------------------------Initial load & onChanged---------------------------- */
    var querySuccess = function(clients){
      $scope.clients = clients;
      if( clients.length === 0 ){
        Alerting.AlertAddMsg('bottom', 'warning', 'There are currently no clients created');
      }
    };

    var queryError = function(err){
      // on error - add server error alert
      Alerting.AlertAddServerMsg(err.status);
    };

    // do the initial request
    Api.Clients.query(querySuccess, queryError);

    $scope.$on('clientsChanged', function () {
      Api.Clients.query(querySuccess, queryError);
    });
    /* -------------------------Initial load & onChanged---------------------------- */



    /* -------------------------Add/edit client popup modal---------------------------- */
    $scope.addClient = function() {
      Alerting.AlertReset();
      $scope.serverRestarting = false;

      $modal.open({
        templateUrl: 'views/clientsmodal.html',
        controller: 'ClientsModalCtrl',
        resolve: {
          client: function () {}
        }
      });
    };

    $scope.editClient = function(client) {
      Alerting.AlertReset();
      $scope.serverRestarting = false;

      $modal.open({
        templateUrl: 'views/clientsmodal.html',
        controller: 'ClientsModalCtrl',
        resolve: {
          client: function () {
            return client;
          }
        }
      });
    };
    /* -------------------------Add/edit client popup modal---------------------------- */



    /*------------------------Delete Confirm----------------------------*/
    $scope.confirmDelete = function(client){
      Alerting.AlertReset();
      $scope.serverRestarting = false;

      var deleteObject = {
        title: 'Delete Client',
        button: 'Delete',
        message: 'Are you sure you wish to delete the client "' + client.name + '"?'
      };

      var modalInstance = $modal.open({
        templateUrl: 'views/confirmModal.html',
        controller: 'ConfirmModalCtrl',
        resolve: {
          confirmObject: function () {
            return deleteObject;
          }
        }
      });

      modalInstance.result.then(function () {
        // Delete confirmed - delete the user
        client.$remove(deleteSuccess, deleteError);
      }, function () {
        // delete cancelled - do nothing
      });

    };

    var deleteSuccess = function () {
      // On success
      $scope.clients = Api.Clients.query();
      Alerting.AlertAddMsg('top', 'success', 'The client has been deleted successfully');
    };

    var deleteError = function (err) {
      // add the error message
      Alerting.AlertAddMsg('top', 'danger', 'An error has occurred while deleting the client: #' + err.status + ' - ' + err.data);
    };
    /*------------------------Delete Confirm----------------------------*/
    
    
    
  
    /*-------------------------------------------------------------------*/
    /*----------------------------------Roles----------------------------*/
    $scope.addNewRole = false;
    $scope.newRoles = [];
    $scope.newRolesIndex = 0;
    
    var apiCall = function(method, parameters, body, callback) {
      var success = function() {
        if (callback) {
          callback();
        }
      };
      
      var error = function(error) {
        Alerting.AlertReset('server');
        Alerting.AlertAddMsg('server', 'error', error);
      };
      
      switch(method) {
        case 'update':
          Api.Roles.update(parameters, body, success, error);
          break;
        case 'save':
          Api.Roles.save(parameters, body, success, error);
          break;
        case 'remove':
          Api.Roles.remove(parameters, body, success, error);
          break;
      }
    };
    
  
    /* -------------------------Load Channels---------------------------- */
    var channelQuerySuccess = function(channels){
      $scope.channels = channels;
      if( channels.length === 0 ){
        Alerting.AlertAddMsg('bottom', 'warning', 'There are currently no channels created');
      } else {
        Alerting.AlertReset('bottom');
      }
    };

    Api.Channels.query(channelQuerySuccess, queryError); // request channels for table columns
    /* -------------------------End Load Channels---------------------------- */
      
    
    /* -------------------------Load Roles---------------------------- */  
    $scope.$watch('channels', function (newVal) {
      if(newVal) {
        loadRoles();  // channels need to be loaded before roles to set up the table columns
      }
    });
    
    var loadRoles = function () {
      var roleQuerySuccess = function(roles) {
        $scope.roles = roles;
        if( roles.length === 0 ) {
          Alerting.AlertAddMsg('bottom', 'warning', 'There are currently no roles created');
        } else {
          Alerting.AlertReset('bottom');
        }
      };

      Api.Roles.query(roleQuerySuccess, queryError); // request roles

      $scope.$on('rolesChanged', function() {
        Api.Roles.query(roleQuerySuccess, queryError);  // listen for changed roles and reload roles
      });
    };
    /* -------------------------End Load Roles---------------------------- */
    
    
    /* -------------------------Assign Clients to Roles---------------------------- */
    $scope.$watch('clients', function (newVal) {
      if(newVal) {
        waitForRoles(); // wait for roles before assigning clients
      }
    });
    
    var waitForRoles = function() {
      $scope.$watch('roles', function (newVal) {
        if(newVal) {
          buildClientsRolesObject();
          buildChannelsRolesObject();
          angular.forEach($scope.roles, function(role) {
            role.displayName = role.name;
          });
        }
      });
    };
    
    var buildClientsRolesObject = function() {
      $scope.clientRoles = {};
      angular.forEach($scope.roles, function(role) {
        for (var i=0;i<role.clients.length;i++) {
          $scope.clientRoles[role.clients[i].clientID + role.name] = true;
        }
      });
    };
    
    

    $scope.assignRoleToClient = function(client, role, save) {
      if(!role.clients) {
        role.clients = [];
      }
      role.clients.push({'_id': client._id, 'name': client.clientID});
      $scope.clientRoles[client.clientID + role.name] = true;
      console.log($scope.clientRoles);
      
      var updateBody = Object.assign({}, role);
      updateBody.name = undefined;
      if(save) {
        apiCall('update', {name:role.name}, updateBody, function() {
          Notify.notify('clientsChanged');
        });
      }
    };
    
    $scope.removeRoleFromClient = function(client, role, save) {
      $scope.clientRoles[client.clientID + role.name] = false;
      
      var index = -1;
      for(var i = 0; i<role.clients.length; i++) {
         if (role.clients[i].clientID ===  client.clientID) {
             index = i;
             break;
         }
      }
      role.clients.splice(index, 1);
      
      var updateBody = Object.assign({}, role);
      updateBody.name = undefined;
      if(save) {
        apiCall('update', {name:role.name}, updateBody, function() {
          Notify.notify('clientsChanged');
        });
      }
    };
    
    $scope.toggleEditClients = function() {
      $scope.editClients = $scope.editClients === true ? false : true;
    };
    /* -------------------------End Assign Clients to Roles---------------------------- */
    
    
    /* -------------------------Assign Roles To Channels---------------------------- */
    var buildChannelsRolesObject = function() {
      $scope.channelRoles = {};
      angular.forEach($scope.channels, function(channel) {
        angular.forEach($scope.roles, function(role) {
          for (var i=0;i<role.channels.length;i++) {
            if (role.channels[i]._id === channel._id) {
              $scope.channelRoles[channel.name + role.name] = true;
            }
          }
        });
      });
    };
    
    $scope.assignRoleToChannel = function(channel, role, save) {
      if(!role.channels) {
        role.channels = []; // if the role has no channels, initialize the array
      }
      role.channels.push({'_id': channel._id, 'name': channel.name});
      $scope.channelRoles[channel.name + role.name] = true;

      var updateBody = Object.assign({}, role);
      updateBody.name = undefined;
      if(save){
        apiCall('update', {name:role.name}, updateBody);
      }
    };
    
    $scope.removeAssignRoleFromChannel = function(channel, role, save) {
      $scope.channelRoles[channel.name + role.name] = false;
      var index = -1;
      for(var i = 0; i<role.channels.length; i++) {
         if (role.channels[i].name ===  channel.name) {
             index = i;
             break;
         }
      }
      role.channels.splice(index, 1);
      
      var updateBody = Object.assign({}, role);
      updateBody.name = undefined;
      if(save) {
        apiCall('update', {name:role.name}, updateBody);
      }
    };
    /* -------------------------End Assign Roles To Channels---------------------------- */
    
    
    /* -------------------------Edit Roles---------------------------- */
    $scope.nameSaved = [];
    $scope.changeRoleName = function(role) {
      try {
        angular.forEach($scope.roles, function(aRole) {
          if(aRole.name === role.displayName) {
            throw 'break';
          }
        });
        var updateBody = {};
        updateBody.name = role.displayName;
        $scope.nameSaved[role.name] = true;
        apiCall('update', {name:role.name}, updateBody);
      } catch (e) {
        $scope.nameSaved[role.name] = true;
      }
    };
    
    $scope.toggleEditRoleNames = function() {
      $scope.editRoleNames = $scope.editRoleNames === true ? false : true;
      $scope.nameSaved = [];
    };
    
    $scope.addRole = function() {
      $scope.newRoles.push(
        {
          idName: 'Role' + $scope.newRolesIndex, 
          index: $scope.newRolesIndex++,
          name: $scope.newRoles.name
        });
    };
    
    
    
    $scope.assignClientToNewRole = function (client, role) {
      if(!role.clients) {
        role.clients = []; // if the role has no clients, initialize the array
      }
      role.clients.push({'_id': client._id, 'name': client.clientID});
      $scope.clientRoles[client.clientID + role.name] = true;
    };
    
    $scope.assignNewRoleToChannel = function (channel, role) {
      if(!role.channels) {
        role.channels = []; // if the role has no channels, initialize the array
      }
      role.channels.push({'_id': channel._id, 'name': channel.name});
      $scope.channelRoles[channel.name + role.name] = true;
    };
    
    $scope.saveNewRole = function(role) {
      apiCall('save', {name:null}, role, function() {
        Notify.notify('rolesChanged');
        $scope.removeNewRole(role);
      });
    };
    
    $scope.removeNewRole = function(role) {
      var spliceIndex = -1;
      
      for(var i = 0; i<$scope.newRoles.length; i++) {
         if ($scope.newRoles[i].name ===  role.name) {
             spliceIndex = i;
             break;
         }
      }
      $scope.newRoles.splice(spliceIndex, 1);
    };
    
    $scope.removeRole = function(role) {
      apiCall('remove', {name:role.name}, function() {
        Notify.notify('rolesChanged');
      });
      var spliceIndex = -1;
      for(var i = 0; i<$scope.roles.length; i++) {
         if ($scope.roles[i].name ===  role.name) {
             spliceIndex = i;
             break;
         }
      }
      $scope.roles.splice(spliceIndex, 1);
    };
    
    /* -------------------------End Edit Roles---------------------------- */
    
    
    /*------------------------Delete Confirm----------------------------*/
    $scope.confirmRoleDelete = function(role){
      Alerting.AlertReset();

      var deleteObject = {
        title: 'Delete Role',
        button: 'Delete',
        message: 'Are you sure you wish to delete the role "' + role.name + '"?'
      };

      var modalInstance = $modal.open({
        templateUrl: 'views/confirmModal.html',
        controller: 'ConfirmModalCtrl',
        resolve: {
          confirmObject: function () {
            return deleteObject;
          }
        }
      });

      modalInstance.result.then(function () {
        // Delete confirmed - delete the user
        $scope.removeRole(role);
      }, function () {
        // delete cancelled - do nothing
      });

    };
    /*------------------------End Delete Confirm----------------------------*/

  });
