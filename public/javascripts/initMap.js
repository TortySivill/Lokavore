function initMap() {
  console.log("map init");
   var uluru = {lat: latr, lang: langr};
   var map = new google.maps.Map(document.getElementById('map'), {
     zoom: 4,
     center: uluru
   });
   var marker = new google.maps.Marker({
     position: uluru,
     map: map
   });
  }
