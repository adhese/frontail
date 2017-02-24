var extractBetween = function(line, start, end) {
    var a = line.indexOf(start) + start.length;
    var b = line.indexOf(end, a);
    return line.substring(a, b);
};

var extractAmount = function(line) {
    var str = extractBetween(line, "Optional[", "]) : ");
    return str.replace('(Optional[', '@ ');
};

var getChart = function(auctionId) {
    var chart = ['Browser->Gateway: Request'];

    var auctionLogs = $('*[class^="line"]')
        .map(function() { return $(this).text(); })
        .filter(function() { return this.indexOf(auctionId) >= 0; })
        .each(function() {
            var line = this;
            if (line.indexOf('Adserver response part received') >= 0) {
                //(took PT0.009S)
                var duration = extractBetween(line, "(took PT", ")");

                chart.push("Gateway->ADSERVER: Request");
                chart.push("Note over ADSERVER: " + duration);
                chart.push("ADSERVER->Gateway: Response");
            } else if (line.indexOf('Market request ready') >= 0) {
                chart.push("Gateway->MARKET: Request");
            } else if (line.indexOf('Market response received') >= 0) {
                var duration = extractBetween(line, "(took PT", ")");

                chart.push("Note over MARKET: " + duration);
                chart.push("MARKET->Gateway: Response");
            } else if (line.indexOf('Adserver bid received') >= 0) {
                //Optional[JERLICIA (Optional[EUR 17.85])
                var amount = extractAmount(line);

                chart.push("Note over Gateway: " + amount);
            } else if (line.indexOf('Market bid received') >= 0) {
                var amount = extractAmount(line);

                chart.push("Note over Gateway: " + amount);
            } else if (line.indexOf('Ad response ready') >= 0) {
                var duration = extractBetween(line, "(took PT", ")");
                var winning = extractAmount(line);

                chart.push("Note over Gateway: " + duration);
                chart.push("Gateway->Browser: Response");
                chart.push("Note over Browser: " + winning);
            }
        });
    return chart;
};

var draw = function() {
    var $diagram = $("#diagram");
    $diagram.empty();
    var auctionId = $('input').val();
    var chart = getChart(auctionId);
    console.log(chart);
    var diagram = Diagram.parse(chart.join('\n'));
    diagram.drawSVG("diagram", { theme: 'simple' });
    $diagram.dialog({
        minWidth: 600,
        minHeight: 600
    });
};

var btn = $('<a/>', {
    text: 'Draw',
    click: draw,
    class: 'btn btn-primary'
});

var diagram = $('<div/>', {
    id: 'diagram'
});

$(document).ready(function() {
    $(".form-group").append(btn);
    $("body").append(diagram);
});

