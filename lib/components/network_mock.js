'use strict';

/*************************************************************************************************/
/*** Use Network Mock For Testing with Travis-CI                                               ***/
/*************************************************************************************************/
module.exports = {
    get_active_interface: function (cb) {
        setTimeout(function () {
            cb(null, {
                ip_address: '127.0.0.1',
                gateway_ip: '127.0.0.1',
                mac_address: '00:11:aa:bb:cc:dd'
            });
        }, 100);
    }
};