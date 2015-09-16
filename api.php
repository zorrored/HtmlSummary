<?php
   function url_exists($url) {
        if (!$fp = curl_init($url)) return false;
        return true;
   }
   $returnval = array();
   $url = "";
   if ($_GET['url']):
    $url=$_GET['url'];
   endif;
   
   // If the URL doesn't exist, return asap.
   if($url == "" || url_exists($url) == false)
   {
       exit(json_encode($returnval));
   }
   
   // Load the html into a DOM object & query all tags.
   $dom = new DOMDocument;
   @$dom->loadHTMLFile($url);   
   $tags = $dom->getElementsByTagName('*');
   
   // For each tag count number of occurrences.
   $count_tag = array();   
   foreach($tags as $tag) {
    if(array_key_exists($tag->tagName, $count_tag)) {
     $count_tag[$tag->tagName] += 1;
    } else {
     $count_tag[$tag->tagName] = 1;
    }
   }
   
   // Get rid of comments to avoid confusion.
   $htmlcontent = preg_replace('/<!--(.|\s)*?-->/', '', $dom->saveHTML());
   
   // Return the results to the client.
   $returnval["nodes"] = $count_tag;
   $returnval["htmlcode"] = $htmlcontent;
   exit(json_encode($returnval));
   
 ?>