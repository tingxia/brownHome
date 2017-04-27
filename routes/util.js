module.exports = {
    /*
        input: 
            int_hours: integer army time hours
            int_minutes: # minutes past the hour
        returns:
            string formatted:
                "hours:minutes am" or HH:MM AM
                where the first H is optional, but always has two digits for minutes
    */
    convertTimeToSpeakableString: function (int_hours, int_minutes) {
        var str_hours = "";
        var str_am_pm = "";
        var str_minutes = int_minutes + "";

        if (int_hours == 0) {
            str_hours = "12";
            str_am_pm = "am";
        } else if (int_hours > 12) {
            str_hours = (int_hours - 12) + "";
            str_am_pm = "pm";
        } else {
            str_hours = int_hours + "";
            str_am_pm = "am";
        }

        if (int_minutes < 10) {
            str_minutes = "0" + int_minutes;
        }

        return str_hours + ":" + str_minutes + " " + str_am_pm;
    }
}