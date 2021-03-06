/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package nl.b3p.catalog.resolution;

import javax.servlet.http.HttpServletResponse;
import net.sourceforge.stripes.action.StreamingResolution;

/**
 *
 * @author Erik van de Pol
 */
public class DefaultErrorResolution extends StreamingResolution {
    
    protected final static String DEFAULT_CONTENT_TYPE = "text/plain";

    public DefaultErrorResolution(String errorMessage) {
        super(DEFAULT_CONTENT_TYPE, errorMessage == null ? "No error message." : errorMessage);
        setCharacterEncoding("UTF-8");
    }

    @Override
    protected void stream(HttpServletResponse response) throws Exception {
        response.setStatus(500);
        super.stream(response);
    }
}
