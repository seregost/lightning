(function() {
  'use strict'
  angular.module('myLightning')
  .controller('SendPaymentController', ['$scope', '$element', 'broadcastService', 'lightningService', 'ModalService', 'close', function($scope, $element, broadcastService, lightningService, ModalService, close) {
    $scope.sendpayment = {};
    $scope.doqrscanner = () => {
      if(window.cordova != null) {
        cordova.plugins.barcodeScanner.scan(
          function (result) {
            if(!result.cancelled) {
              if(result.format == "QR_CODE") {
                $scope.sendpayment.invoicecode = result.text;
                $scope.$apply();
              }
            }
          },
          function (error) {
            alert("Scanning failed: " + error);
          }
        );
      }
      else {
        // angular.element('#quickpaymodal').modal('show');
        ModalService.showModal({
          templateUrl: "modals/qrscanner.html",
          controller: "QRScannerController",
        }).then(function(modal) {
          // The modal object has the element built, if this is a bootstrap modal
          // you can call 'modal' to show it, if it's a custom modal just show or hide
          // it as you need to.
          modal.element.modal();
          modal.close.then(function(result) {
            $scope.sendpayment.invoicecode = result;
          });
        });
      }
    }

    $scope.showinfo = () => {
      broadcastService.send("child:showalert",
        "To submit your payment, please enter or scan the routing number provided by your vendor.  You can use your camera to scan a QR invoice image from the internet or someone else's phone.");
    }

    $scope.sendpayment = () => {
      var invoicecode = $scope.sendpayment.invoicecode;
      var alias = $scope.sendpayment.alias;

      // TODO: decode invoice to make sure it is what we expect.
      if(invoicecode.length > 80) {
        $("#sendpaymentmodal").hide();
        ModalService.showModal({
          templateUrl: "modals/verification.html",
          controller: "VerificationController",
          inputs: {
            message: "Please enter your PIN to confirm that you wish to pay this invoice."
          }
        }).then(function(modal) {
          // The modal object has the element built, if this is a bootstrap modal
          // you can call 'modal' to show it, if it's a custom modal just show or hide
          // it as you need to.
          modal.element.modal();
          modal.close.then(function(result) {
            $("#sendpaymentmodal").show();
            if(result.confirmed == true)
            {
              $scope.sendpayment.loading=true;

              lightningService.execSendInvoice(result.password, invoicecode, alias).then((response) => {
                if(response.data.error == null) {
                  $scope.sendpayment.haserror = false;
                  $scope.sendpayment.success = true;

                  closemodal();
                  close($scope.sendpayment);
                }
                else {
                    $scope.sendpayment.haserror = true;
                    $scope.sendpayment.error = response.data.error.message;
                }
                $scope.sendpayment.loading = false;
              });
            };
          });
        });
      }
      else {
        // TODO: pay to bitcoin address
        $scope.sendpayment.haserror = true;
        $scope.sendpayment.error = "Invalid routing number.";
      }
    }

    $scope.close = () => {
      closemodal();
      close($scope.sendpayment, 500); // close, but give 500ms for bootstrap to animate
    };

    function closemodal()
    {
      $element.modal('hide');

      // Hack to eliminate backdrop remaining bug.
      $('body').removeClass('modal-open');
      var backdrop = $(".modal-backdrop");
      if(backdrop != null) backdrop.remove();
    }
  }]);
})();
