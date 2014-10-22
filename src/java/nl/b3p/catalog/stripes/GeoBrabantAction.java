/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package nl.b3p.catalog.stripes;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import net.sourceforge.stripes.action.DefaultHandler;
import net.sourceforge.stripes.action.ForwardResolution;
import net.sourceforge.stripes.action.Resolution;
import net.sourceforge.stripes.validation.Validate;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author Geert Plaisier
 */
public class GeoBrabantAction extends DefaultAction {
    
    private final static Log log = LogFactory.getLog(GeoBrabantAction.class);
    
    @Validate(required=false)
    private String searchString;

    @Validate(required=false)
    private String searchType;

    @Validate(required=false)
    private String uuid;
    
    private List<MapsBean> mapsList;
    
    @DefaultHandler
    public Resolution home() {
        return new ForwardResolution("/WEB-INF/jsp/geobrabant/home.jsp");
    }
    
    /* Static pages */
    public Resolution overgeobrabant() {
        return new ForwardResolution("/WEB-INF/jsp/geobrabant/overgeobrabant.jsp");
    }
    public Resolution diensten() {
        return new ForwardResolution("/WEB-INF/jsp/geobrabant/diensten.jsp");
    }
    public Resolution contact() {
        return new ForwardResolution("/WEB-INF/jsp/geobrabant/contact.jsp");
    }
    
    public Resolution kaarten() {
        // This JSON should be fetched from a server somewhere
        String mapsJson = "[" +
            "{\"title\":\"Infra\",\"url\":\"http://geobrabant.b3p.nl/viewer/app/basis/v1\"}," +
            "{\"title\":\"Vergunningen\",\"url\":\"http://geobrabant.b3p.nl/viewer/app/basis/v1\"}," +
            "{\"title\":\"Milieu\",\"url\":\"http://geobrabant.b3p.nl/viewer/app/Milieu/v1\"}," +
            "{\"title\":\"AgriFood Capital\",\"url\":\"http://geobrabant.b3p.nl/viewer/app/Economie_en_bedrijvigheid/v1\"}," +
            "{\"title\":\"Flora en Fauna\",\"url\":\"http://geobrabant.b3p.nl/viewer/app/basis/v1\"}" +
        "]";
        
        this.mapsList = new ArrayList<MapsBean>();
        try {
            JSONArray maps = new JSONArray(mapsJson);
            for (int i = 0; i < maps.length(); ++i) {
                JSONObject rec = maps.getJSONObject(i);
                MapsBean map = new MapsBean();
                map.setTitle(rec.getString("title"));
                map.setUrl(rec.getString("url"));
                this.mapsList.add(map);
            }
        } catch (JSONException ex) {
            Logger.getLogger(GeoBrabantAction.class.getName()).log(Level.SEVERE, null, ex);
        }
        
        return new ForwardResolution("/WEB-INF/jsp/geobrabant/kaarten.jsp");
    }
    
    public Resolution catalogus() {
        return new ForwardResolution("/WEB-INF/jsp/geobrabant/catalogus.jsp");
    }
    
    public Resolution zoeken() {
        return new ForwardResolution("/WEB-INF/jsp/geobrabant/zoeken.jsp");
    }

    public String getSearchString() {
        return searchString;
    }

    public void setSearchString(String searchString) {
        this.searchString = searchString;
    }

    public String getSearchType() {
        return searchType;
    }

    public void setSearchType(String searchType) {
        this.searchType = searchType;
    }

    public String getUuid() {
        return uuid;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public List<MapsBean> getMapsList() {
        return mapsList;
    }

    public void setMapsList(List<MapsBean> mapsList) {
        this.mapsList = mapsList;
    }
    
    public class MapsBean {
        
        private String title;
        
        private String url;
        
        public MapsBean() {
            
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

    }

}